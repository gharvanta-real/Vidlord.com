use serde::{Serialize, Deserialize};
use reqwest::Client;
use std::time::Duration;
use regex::Regex;
use crate::errors::ScraperError;
use super::{Extractor, ExtractionResult, VideoInfo, VideoFormat};
use tokio::process::Command;

const COBALT_INSTANCES: &[&str] = &[
    "rue-cobalt.xenon.zone",
    "api.cobalt.liubquanti.click",
    "dog.kittycat.boo",
    "fox.kittycat.boo",
    "cobaltapi.kittycat.boo",
];

pub struct InstagramExtractor {
    client: Client,
}

impl InstagramExtractor {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(12))
            .user_agent(crate::server::get_configured_user_agent())
            .danger_accept_invalid_certs(true)
            .build()
            .unwrap_or_default();
        Self { client }
    }

    pub fn extract_shortcode(&self, url: &str) -> Option<String> {
        let reg = Regex::new(r"(?i)instagram\.com/(?:p|reel)/([a-zA-Z0-9_-]+)").ok()?;
        let caps = reg.captures(url)?;
        caps.get(1).map(|m| m.as_str().to_string())
    }
}

#[derive(Serialize)]
struct CobaltRequest<'a> {
    url: &'a str,
}

#[derive(Deserialize, Debug)]
struct CobaltResponse {
    status: String,
    url: Option<String>,
    picker: Option<Vec<CobaltPickerItem>>,
    error: Option<CobaltErrorDetail>,
}

#[derive(Deserialize, Debug)]
struct CobaltPickerItem {
    url: Option<String>,
    #[serde(rename = "type")]
    item_type: Option<String>,
}

#[derive(Deserialize, Debug)]
struct CobaltErrorDetail {
    code: Option<String>,
}

impl Extractor for InstagramExtractor {
    fn can_handle(&self, url: &str) -> bool {
        url.contains("instagram.com") || url.contains("ddinstagram.com")
    }

    async fn extract(&self, url: &str) -> Result<ExtractionResult, ScraperError> {
        let shortcode = self.extract_shortcode(url).unwrap_or_else(|| "Post".to_string());

        // 1. Try local yt-dlp first
        match self.extract_via_ytdlp(url).await {
            Ok(result) => return Ok(result),
            Err(e) => {
                println!("yt-dlp extraction failed for Instagram: {}. Falling back to Cobalt API.", e);
            }
        }

        // 2. Fallback to Cobalt instances
        let mut last_err = String::from("No working Cobalt instances found");

        for instance in COBALT_INSTANCES {
            let api_url = format!("https://{}/", instance);
            let payload = CobaltRequest { url };
            
            match self.client.post(&api_url)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .json(&payload)
                .send()
                .await 
            {
                Ok(resp) => {
                    let status_code = resp.status();
                    if status_code != 200 {
                        last_err = format!("Instance {} returned HTTP status {}", instance, status_code);
                        continue;
                    }

                    match resp.json::<CobaltResponse>().await {
                        Ok(data) => {
                            if let Some(err_detail) = data.error {
                                last_err = format!("Instance {} error: {:?}", instance, err_detail.code);
                                continue;
                            }

                            let mut resolved_url = None;

                            if (data.status == "redirect" || data.status == "stream") && data.url.is_some() {
                                resolved_url = data.url;
                            } else if data.status == "picker" {
                                if let Some(items) = data.picker {
                                    // Try finding video first
                                    let video_item = items.iter().find(|i| {
                                        i.item_type.as_ref().map(|t| t == "video").unwrap_or(false)
                                    });
                                    resolved_url = video_item.and_then(|i| i.url.clone())
                                        .or_else(|| items.first().and_then(|i| i.url.clone()));
                                }
                            }

                            if let Some(stream_url) = resolved_url {
                                let info = VideoInfo {
                                    title: format!("Instagram Video ({})", shortcode),
                                    thumbnail_url: "".to_string(), // Let the browser player render first frame as poster
                                    source_url: url.to_string(),
                                    duration: "Reel".to_string(),
                                    platform: "Instagram".to_string(),
                                };

                                let formats = vec![
                                    VideoFormat {
                                        quality: "Source Video (MP4)".to_string(),
                                        size_mb: 0.0,
                                        download_url: stream_url,
                                        is_audio: false,
                                        audio_download_url: None,
                                    }
                                ];

                                return Ok(ExtractionResult { info, formats });
                            } else {
                                last_err = format!("Instance {} response had no valid stream URL", instance);
                            }
                        }
                        Err(e) => {
                            last_err = format!("Failed to parse JSON response from {}: {}", instance, e);
                        }
                    }
                }
                Err(e) => {
                    last_err = format!("Failed to connect to {}: {}", instance, e);
                }
            }
        }

        Err(ScraperError::ExtractionError(format!(
            "Failed to resolve Instagram video details from local yt-dlp or any Cobalt instance. Cobalt last error: {}",
            last_err
        )))
    }
}

impl InstagramExtractor {
    async fn extract_via_ytdlp(&self, url: &str) -> Result<ExtractionResult, ScraperError> {
        let output = Command::new("yt-dlp")
            .args(&[
                "-j",
                "--no-playlist",
                "--remote-components",
                "ejs:github",
                "--js-runtimes",
                "node",
                url,
            ])
            .output()
            .await
            .map_err(|e| ScraperError::ExtractionError(format!("Failed to execute yt-dlp: {}", e)))?;
            
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(ScraperError::ExtractionError(format!("yt-dlp failed: {}", stderr)));
        }
        
        let stdout = String::from_utf8_lossy(&output.stdout);
        let data: serde_json::Value = serde_json::from_str(&stdout)
            .map_err(|e| ScraperError::ExtractionError(format!("Failed to parse yt-dlp JSON: {}", e)))?;
            
        let title = data["title"].as_str().unwrap_or("Instagram Reel").to_string();
        let shortcode = self.extract_shortcode(url).unwrap_or_else(|| "Post".to_string());
        
        let thumbnail_url = data["thumbnail"].as_str()
            .unwrap_or("")
            .to_string();
            
        let info = VideoInfo {
            title: format!("{} ({})", title, shortcode),
            thumbnail_url,
            source_url: url.to_string(),
            duration: "Reel".to_string(),
            platform: "Instagram".to_string(),
        };
        
        let mut formats = Vec::new();
        
        if let Some(formats_arr) = data["formats"].as_array() {
            let mut best_video = None;
            let mut max_height = 0;
            for f in formats_arr {
                let vcodec = f["vcodec"].as_str().unwrap_or("none");
                if vcodec != "none" {
                    let height = f["height"].as_i64().unwrap_or(0);
                    if height >= max_height {
                        max_height = height;
                        best_video = Some(f);
                    }
                }
            }
            if let Some(vf) = best_video {
                if let Some(url_str) = vf["url"].as_str() {
                    formats.push(VideoFormat {
                        quality: "Source Video (MP4)".to_string(),
                        size_mb: 0.0,
                        download_url: url_str.to_string(),
                        is_audio: false,
                        audio_download_url: None,
                    });
                }
            }
        }
        
        if formats.is_empty() {
            if let Some(direct_url) = data["url"].as_str() {
                formats.push(VideoFormat {
                    quality: "Source Video (MP4)".to_string(),
                    size_mb: 0.0,
                    download_url: direct_url.to_string(),
                    is_audio: false,
                    audio_download_url: None,
                });
            }
        }
        
        if formats.is_empty() {
            return Err(ScraperError::ExtractionError("No valid Instagram media streams found".to_string()));
        }
        
        Ok(ExtractionResult { info, formats })
    }
}
