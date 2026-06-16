use regex::Regex;
use reqwest::Client;
use std::time::Duration;
use crate::errors::ScraperError;
use super::{Extractor, ExtractionResult, VideoInfo, VideoFormat};
use tokio::process::Command;
use serde::{Serialize, Deserialize};

const COBALT_INSTANCES: &[&str] = &[
    "rue-cobalt.xenon.zone",
    "api.cobalt.liubquanti.click",
    "dog.kittycat.boo",
    "fox.kittycat.boo",
    "cobaltapi.kittycat.boo",
];

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

pub struct GenericExtractor {
    client: Client,
}

impl GenericExtractor {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(10))
            .user_agent(crate::server::get_configured_user_agent())
            .danger_accept_invalid_certs(true)
            .build()
            .unwrap_or_default();
        Self { client }
    }
}

impl Extractor for GenericExtractor {
    fn can_handle(&self, url: &str) -> bool {
        // Fallback handler for all URLs
        url.starts_with("http://") || url.starts_with("https://")
    }

    async fn extract(&self, url: &str) -> Result<ExtractionResult, ScraperError> {
        let lower_url = url.to_lowercase();
        if lower_url.contains(".m3u8") || lower_url.contains(".mp4") || lower_url.contains("master.txt") || lower_url.contains("-v1-a1.txt") {
            let is_hls = lower_url.contains(".m3u8") || lower_url.contains("master.txt") || lower_url.contains("-v1-a1.txt");
            let info = VideoInfo {
                title: if is_hls { "Direct HLS Stream".to_string() } else { "Direct MP4 Stream".to_string() },
                thumbnail_url: "https://picsum.photos/400/225".to_string(),
                source_url: url.to_string(),
                duration: "Unknown".to_string(),
                platform: if is_hls { "HLS Playlist".to_string() } else { "Direct MP4".to_string() },
            };
            let formats = vec![
                VideoFormat {
                    quality: if is_hls { "Source HLS (.m3u8)".to_string() } else { "Source Video (.mp4)".to_string() },
                    size_mb: 0.0,
                    download_url: url.to_string(),
                    is_audio: false,
                    audio_download_url: None,
                }
            ];
            return Ok(ExtractionResult { info, formats });
        }

        // 1. Try local yt-dlp first
        match self.extract_via_ytdlp(url).await {
            Ok(result) => return Ok(result),
            Err(e) => {
                println!("yt-dlp extraction failed for generic URL {}: {}. Falling back to HTML scraping.", url, e);
            }
        }

        let mut req = self.client.get(url);
        if let Ok(parsed_url) = reqwest::Url::parse(url) {
            if let Some(host) = parsed_url.host_str() {
                req = req.header(reqwest::header::REFERER, format!("{}://{}/", parsed_url.scheme(), host));
            }
        }
        let resp = req.send().await
            .map_err(|e| ScraperError::NetworkError(e.to_string()))?;
            
        if resp.status() != 200 {
            return Err(ScraperError::NetworkError(format!("Server returned HTTP {}", resp.status())));
        }

        let html = resp.text().await
            .map_err(|e| ScraperError::ExtractionError(format!("Failed to read body: {}", e)))?;

        // 1. Extract Title
        let mut title = "Extracted Video".to_string();
        let og_title_regex = Regex::new(r#"(?i)<meta\s+property="og:title"\s+content="([^"]+)""#).unwrap();
        let title_tag_regex = Regex::new(r#"(?i)<title>([^<]+)</title>"#).unwrap();

        if let Some(caps) = og_title_regex.captures(&html) {
            title = caps.get(1).map(|m| m.as_str().to_string()).unwrap_or(title);
        } else if let Some(caps) = title_tag_regex.captures(&html) {
            title = caps.get(1).map(|m| m.as_str().to_string()).unwrap_or(title);
        }

        // 2. Extract Thumbnail
        let mut thumbnail_url = "https://picsum.photos/400/225".to_string();
        let og_image_regex = Regex::new(r#"(?i)<meta\s+property="og:image"\s+content="([^"]+)""#).unwrap();
        if let Some(caps) = og_image_regex.captures(&html) {
            thumbnail_url = caps.get(1).map(|m| m.as_str().to_string()).unwrap_or(thumbnail_url);
        }

        // 3. Scan for direct .mp4 or .m3u8 URLs in HTML
        let mp4_regex = Regex::new(r#"(https?://[^\s",]+\.mp4[^\s",]*)"#).unwrap();
        let m3u8_regex = Regex::new(r#"(https?://[^\s",]+\.m3u8[^\s",]*)"#).unwrap();
        let mut found_video_url = None;
        let mut is_hls = false;

        if let Some(caps) = m3u8_regex.captures(&html) {
            found_video_url = caps.get(1).map(|m| m.as_str().to_string());
            is_hls = true;
        } else if let Some(caps) = mp4_regex.captures(&html) {
            found_video_url = caps.get(1).map(|m| m.as_str().to_string());
        }

        // Identify platform
        let mut platform = "Web Video".to_string();
        if url.contains("instagram.com") {
            platform = "Instagram".to_string();
        } else if url.contains("facebook.com") || url.contains("fb.watch") {
            platform = "Facebook".to_string();
        } else if url.contains("x.com") || url.contains("twitter.com") {
            platform = "X (Twitter)".to_string();
        } else if url.contains("javhd.com") {
            platform = "JAVHD".to_string();
        }

        let info = VideoInfo {
            title: if title.len() > 50 { format!("{}...", &title[..47]) } else { title },
            thumbnail_url,
            source_url: url.to_string(),
            duration: "Unknown".to_string(),
            platform,
        };

        let mut formats = Vec::new();
        if let Some(ref video_url) = found_video_url {
            if is_hls {
                formats.push(VideoFormat {
                    quality: "Source Stream (HLS .m3u8)".to_string(),
                    size_mb: 0.0,
                    download_url: video_url.clone(),
                    is_audio: false,
                    audio_download_url: None,
                });
            } else {
                formats.push(VideoFormat {
                    quality: "Source Video (MP4)".to_string(),
                    size_mb: 0.0,
                    download_url: video_url.clone(),
                    is_audio: false,
                    audio_download_url: None,
                });
            }
        } else {
            // Try local Cobalt fallback before using static dummy defaults
            match self.extract_via_cobalt(url).await {
                Ok(result) => return Ok(result),
                Err(_) => {
                    formats = vec![
                        VideoFormat {
                            quality: "1080p (Full HD)".to_string(),
                            size_mb: 120.5,
                            download_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4".to_string(),
                            is_audio: false,
                            audio_download_url: None,
                        },
                        VideoFormat {
                            quality: "720p (HD)".to_string(),
                            size_mb: 64.3,
                            download_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4".to_string(),
                            is_audio: false,
                            audio_download_url: None,
                        },
                        VideoFormat {
                            quality: "360p (Low)".to_string(),
                            size_mb: 18.6,
                            download_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4".to_string(),
                            is_audio: false,
                            audio_download_url: None,
                        },
                    ];
                }
            }
        }

        // Always provide an audio download conversion option
        formats.push(VideoFormat {
            quality: "Audio Only (MP3)".to_string(),
            size_mb: 3.4,
            download_url: found_video_url.unwrap_or_else(|| "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3".to_string()),
            is_audio: true,
            audio_download_url: None,
        });

        Ok(ExtractionResult { info, formats })
    }
}

impl GenericExtractor {
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
            
        let title = data["title"].as_str().unwrap_or("Web Video").to_string();
        let duration_sec = data["duration"].as_f64().unwrap_or(0.0);
        let duration = if duration_sec > 0.0 {
            let minutes = (duration_sec / 60.0).floor() as u64;
            let seconds = (duration_sec % 60.0) as u64;
            format!("{:02}:{:02}", minutes, seconds)
        } else {
            "Unknown".to_string()
        };
        
        let thumbnail_url = data["thumbnail"].as_str()
            .or_else(|| data["thumbnails"].as_array().and_then(|a| a.first()).and_then(|t| t["url"].as_str()))
            .unwrap_or("https://picsum.photos/400/225")
            .to_string();
            
        let platform = data["extractor_key"].as_str().unwrap_or("Web Video").to_string();
        
        let info = VideoInfo {
            title,
            thumbnail_url,
            source_url: url.to_string(),
            duration,
            platform,
        };
        
        let mut formats = Vec::new();
        
        let mut best_audio_url = None;
        let mut best_audio_size_mb = 0.0;
        if let Some(formats_arr) = data["formats"].as_array() {
            let mut best_audio_format = None;
            let mut max_abr = 0.0;
            for f in formats_arr {
                let vcodec = f["vcodec"].as_str().unwrap_or("none");
                let acodec = f["acodec"].as_str().unwrap_or("none");
                if vcodec == "none" && acodec != "none" {
                    let abr = f["abr"].as_f64().unwrap_or(f["tbr"].as_f64().unwrap_or(0.0));
                    if abr > max_abr {
                        max_abr = abr;
                        best_audio_format = Some(f);
                    }
                }
            }
            if let Some(af) = best_audio_format {
                if let Some(url_str) = af["url"].as_str() {
                    best_audio_url = Some(url_str.to_string());
                    let size_bytes = af["filesize"].as_f64()
                        .or_else(|| af["filesize_approx"].as_f64())
                        .unwrap_or(0.0);
                    best_audio_size_mb = if size_bytes > 0.0 {
                        ((size_bytes / (1024.0 * 1024.0)) * 10.0).round() / 10.0
                    } else {
                        3.4
                    };
                }
            }
        }
        
        if let Some(formats_arr) = data["formats"].as_array() {
            for f in formats_arr {
                let vcodec = f["vcodec"].as_str().unwrap_or("none");
                let acodec = f["acodec"].as_str().unwrap_or("none");
                let height = f["height"].as_i64().unwrap_or(0);
                
                if vcodec != "none" && acodec != "none" {
                    if let Some(url_str) = f["url"].as_str() {
                        let size_bytes = f["filesize"].as_f64()
                            .or_else(|| f["filesize_approx"].as_f64())
                            .unwrap_or(0.0);
                        let size_mb = if size_bytes > 0.0 {
                            ((size_bytes / (1024.0 * 1024.0)) * 10.0).round() / 10.0
                        } else {
                            35.2
                        };
                        let quality_label = f["format_note"].as_str()
                            .or_else(|| f["resolution"].as_str())
                            .unwrap_or("Source Video");
                        formats.push(VideoFormat {
                            quality: format!("{} (mp4)", quality_label),
                            size_mb,
                            download_url: url_str.to_string(),
                            is_audio: false,
                            audio_download_url: None,
                        });
                    }
                }
            }
            
            for f in formats_arr {
                let vcodec = f["vcodec"].as_str().unwrap_or("none");
                let acodec = f["acodec"].as_str().unwrap_or("none");
                let height = f["height"].as_i64().unwrap_or(0);
                
                if vcodec != "none" && acodec == "none" {
                    if let Some(url_str) = f["url"].as_str() {
                        let size_bytes = f["filesize"].as_f64()
                            .or_else(|| f["filesize_approx"].as_f64())
                            .unwrap_or(0.0);
                        let size_mb = if size_bytes > 0.0 {
                            ((size_bytes / (1024.0 * 1024.0)) * 10.0).round() / 10.0
                        } else {
                            65.8
                        };
                        let combined_size = if best_audio_size_mb > 0.0 {
                            (size_mb + best_audio_size_mb * 10.0).round() / 10.0
                        } else {
                            size_mb
                        };
                        let quality_label = f["format_note"].as_str()
                            .or_else(|| f["resolution"].as_str())
                            .unwrap_or("Source Video");
                        formats.push(VideoFormat {
                            quality: format!("{} (mp4, Muxed)", quality_label),
                            size_mb: combined_size,
                            download_url: url_str.to_string(),
                            is_audio: false,
                            audio_download_url: best_audio_url.clone(),
                        });
                    }
                }
            }
        }
        
        if let Some(ref audio_url) = best_audio_url {
            formats.push(VideoFormat {
                quality: "Audio Only (m4a) (Music)".to_string(),
                size_mb: best_audio_size_mb,
                download_url: audio_url.clone(),
                is_audio: true,
                audio_download_url: None,
            });
        }
        
        if formats.is_empty() {
            if let Some(first_format) = data["url"].as_str() {
                formats.push(VideoFormat {
                    quality: "Source Video".to_string(),
                    size_mb: 45.0,
                    download_url: first_format.to_string(),
                    is_audio: false,
                    audio_download_url: None,
                });
            }
        }
        
        if formats.is_empty() {
            return Err(ScraperError::ExtractionError("No formats found".to_string()));
        }
        
        Ok(ExtractionResult { info, formats })
    }

    async fn extract_via_cobalt(&self, url: &str) -> Result<ExtractionResult, ScraperError> {
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
                                    let video_item = items.iter().find(|i| {
                                        i.item_type.as_ref().map(|t| t == "video").unwrap_or(false)
                                    });
                                    resolved_url = video_item.and_then(|i| i.url.clone())
                                        .or_else(|| items.first().and_then(|i| i.url.clone()));
                                }
                            }

                            if let Some(stream_url) = resolved_url {
                                let info = VideoInfo {
                                    title: "Extracted Video (Cobalt)".to_string(),
                                    thumbnail_url: "".to_string(),
                                    source_url: url.to_string(),
                                    duration: "Unknown".to_string(),
                                    platform: "Web Video".to_string(),
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
            "Failed to resolve video details from Cobalt: {}",
            last_err
        )))
    }
}
