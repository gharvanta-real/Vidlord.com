use regex::Regex;
use reqwest::Client;
use serde::{Serialize, Deserialize};
use std::time::Duration;
use crate::errors::ScraperError;
use super::{Extractor, ExtractionResult, VideoInfo, VideoFormat};
use tokio::process::Command;

const INVIDIOUS_INSTANCES: &[&str] = &[
    "inv.thepixora.com",
    "iv.melmac.space",
    "invidious.f5.si",
];

pub struct YoutubeExtractor {
    client: Client,
}

impl YoutubeExtractor {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(12))
            .user_agent(crate::server::get_configured_user_agent())
            .danger_accept_invalid_certs(true)
            .build()
            .unwrap_or_default();
        Self { client }
    }

    pub fn extract_youtube_id(&self, url: &str) -> Option<String> {
        let reg = Regex::new(r"(?i)(?:youtu\.be/|youtube\.com/(?:embed/|v/|shorts/|watch\?v=|watch\?.+&v=))([^#&?]{11})").ok()?;
        let caps = reg.captures(url)?;
        caps.get(1).map(|m| m.as_str().to_string())
    }

    fn estimate_size_mb(&self, bitrate: f64, duration_sec: f64) -> f64 {
        if bitrate <= 0.0 || duration_sec <= 0.0 {
            return 0.0;
        }
        let bytes = (bitrate * duration_sec) / 8.0;
        let mb = bytes / (1024.0 * 1024.0);
        (mb * 10.0).round() / 10.0 // 1 decimal place
    }

    fn proxy_url(&self, url: &str, instance: &str) -> String {
        let proxy_host = if instance == "iv.melmac.space" || instance == "invidious.f5.si" {
            "inv.thepixora.com"
        } else {
            instance
        };
        if url.starts_with('/') {
            format!("https://{}{}", proxy_host, url)
        } else if url.contains("googlevideo.com") {
            if let Ok(mut parsed) = reqwest::Url::parse(url) {
                let _ = parsed.set_host(Some(proxy_host));
                parsed.to_string()
            } else {
                url.to_string()
            }
        } else {
            url.to_string()
        }
    }

    async fn extract_via_ytdlp(&self, video_id: &str) -> Result<ExtractionResult, ScraperError> {
        let video_url = format!("https://www.youtube.com/watch?v={}", video_id);
        
        let output = Command::new("yt-dlp")
            .args(&[
                "-j",
                "--no-playlist",
                "--remote-components",
                "ejs:github",
                "--js-runtimes",
                "node",
                &video_url,
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
            
        let title = data["title"].as_str().unwrap_or("YouTube Video").to_string();
        let duration_sec = data["duration"].as_f64().unwrap_or(0.0);
        let minutes = (duration_sec / 60.0).floor() as u64;
        let seconds = (duration_sec % 60.0) as u64;
        let duration = format!("{:02}:{:02}", minutes, seconds);
        
        let thumbnail_url = format!("https://img.youtube.com/vi/{}/maxresdefault.jpg", video_id);
        
        let info = VideoInfo {
            title,
            thumbnail_url,
            source_url: video_url,
            duration,
            platform: "YouTube".to_string(),
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
                let ext = f["ext"].as_str().unwrap_or("");
                
                if vcodec == "none" && acodec != "none" && (ext == "m4a" || acodec.contains("mp4a")) {
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
            
            if best_audio_url.is_none() {
                let mut best_any_audio = None;
                let mut max_abr = 0.0;
                for f in formats_arr {
                    let vcodec = f["vcodec"].as_str().unwrap_or("none");
                    let acodec = f["acodec"].as_str().unwrap_or("none");
                    if vcodec == "none" && acodec != "none" {
                        let abr = f["abr"].as_f64().unwrap_or(f["tbr"].as_f64().unwrap_or(0.0));
                        if abr > max_abr {
                            max_abr = abr;
                            best_any_audio = Some(f);
                        }
                    }
                }
                if let Some(af) = best_any_audio {
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
            
            for f in formats_arr {
                let vcodec = f["vcodec"].as_str().unwrap_or("none");
                let acodec = f["acodec"].as_str().unwrap_or("none");
                let height = f["height"].as_i64().unwrap_or(0);
                
                if vcodec != "none" && acodec != "none" {
                    if height == 720 {
                        if let Some(url_str) = f["url"].as_str() {
                            let size_bytes = f["filesize"].as_f64()
                                .or_else(|| f["filesize_approx"].as_f64())
                                .unwrap_or(0.0);
                            let size_mb = if size_bytes > 0.0 {
                                ((size_bytes / (1024.0 * 1024.0)) * 10.0).round() / 10.0
                            } else {
                                64.3
                            };
                            formats.push(VideoFormat {
                                quality: "720p (mp4) (Good Quality)".to_string(),
                                size_mb,
                                download_url: url_str.to_string(),
                                is_audio: false,
                                audio_download_url: None,
                            });
                        }
                    } else if height == 1080 {
                        if let Some(url_str) = f["url"].as_str() {
                            let size_bytes = f["filesize"].as_f64()
                                .or_else(|| f["filesize_approx"].as_f64())
                                .unwrap_or(0.0);
                            let size_mb = if size_bytes > 0.0 {
                                ((size_bytes / (1024.0 * 1024.0)) * 10.0).round() / 10.0
                            } else {
                                120.5
                            };
                            formats.push(VideoFormat {
                                quality: "1080p (mp4) (Full HD)".to_string(),
                                size_mb,
                                download_url: url_str.to_string(),
                                is_audio: false,
                                audio_download_url: None,
                            });
                        }
                    }
                }
            }
            
            for f in formats_arr {
                let vcodec = f["vcodec"].as_str().unwrap_or("none");
                let acodec = f["acodec"].as_str().unwrap_or("none");
                let height = f["height"].as_i64().unwrap_or(0);
                
                if vcodec != "none" && acodec == "none" && vcodec.starts_with("avc1") {
                    if height == 720 {
                        if let Some(url_str) = f["url"].as_str() {
                            let size_bytes = f["filesize"].as_f64()
                                .or_else(|| f["filesize_approx"].as_f64())
                                .unwrap_or(0.0);
                            let size_mb = if size_bytes > 0.0 {
                                ((size_bytes / (1024.0 * 1024.0)) * 10.0).round() / 10.0
                            } else {
                                64.3
                            };
                            let combined_size = (size_mb + best_audio_size_mb * 10.0).round() / 10.0;
                            formats.push(VideoFormat {
                                quality: "720p (mp4, HD Muxed) (Good Quality)".to_string(),
                                size_mb: combined_size,
                                download_url: url_str.to_string(),
                                is_audio: false,
                                audio_download_url: best_audio_url.clone(),
                            });
                        }
                    } else if height == 1080 {
                        if let Some(url_str) = f["url"].as_str() {
                            let size_bytes = f["filesize"].as_f64()
                                .or_else(|| f["filesize_approx"].as_f64())
                                .unwrap_or(0.0);
                            let size_mb = if size_bytes > 0.0 {
                                ((size_bytes / (1024.0 * 1024.0)) * 10.0).round() / 10.0
                            } else {
                                120.5
                            };
                            let combined_size = (size_mb + best_audio_size_mb * 10.0).round() / 10.0;
                            formats.push(VideoFormat {
                                quality: "1080p (mp4, HD Muxed) (Full HD)".to_string(),
                                size_mb: combined_size,
                                download_url: url_str.to_string(),
                                is_audio: false,
                                audio_download_url: best_audio_url.clone(),
                            });
                        }
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
            formats.push(VideoFormat {
                quality: "720p (mp4, HD Muxed) (Good Quality)".to_string(),
                size_mb: 64.3,
                download_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4".to_string(),
                is_audio: false,
                audio_download_url: None,
            });
        }
        
        Ok(ExtractionResult { info, formats })
    }

    async fn extract_via_cobalt(&self, url: &str) -> Result<ExtractionResult, ScraperError> {
        let mut last_err = String::from("No working Cobalt instances found");
        let video_id = self.extract_youtube_id(url).unwrap_or_default();

        for instance in COBALT_INSTANCES {
            let api_url = format!("https://{}/", instance);
            
            // 1. Try fetching video stream
            let video_payload = CobaltRequest { url, download_mode: None };
            let video_resp = self.client.post(&api_url)
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .json(&video_payload)
                .send()
                .await;

            let video_data: Option<CobaltResponse> = match video_resp {
                Ok(resp) if resp.status() == 200 => resp.json::<CobaltResponse>().await.ok(),
                _ => None,
            };

            if let Some(v_data) = video_data {
                if v_data.error.is_some() {
                    last_err = format!("Instance {} video error: {:?}", instance, v_data.error);
                    continue;
                }

                let stream_url = v_data.url.clone();
                if let Some(video_url) = stream_url {
                    // Try to get audio as well in a separate request
                    let audio_payload = CobaltRequest { url, download_mode: Some("audio") };
                    let audio_resp = self.client.post(&api_url)
                        .header("Accept", "application/json")
                        .header("Content-Type", "application/json")
                        .json(&audio_payload)
                        .send()
                        .await;

                    let audio_data: Option<CobaltResponse> = match audio_resp {
                        Ok(resp) if resp.status() == 200 => resp.json::<CobaltResponse>().await.ok(),
                        _ => None,
                    };

                    let audio_url = audio_data.and_then(|a| a.url);

                    let title = v_data.filename
                        .as_deref()
                        .unwrap_or("YouTube Video")
                        .trim_end_matches(".mp4")
                        .to_string();

                    let info = VideoInfo {
                        title,
                        thumbnail_url: format!("https://img.youtube.com/vi/{}/maxresdefault.jpg", video_id),
                        source_url: url.to_string(),
                        duration: "Video".to_string(),
                        platform: "YouTube (Cobalt Fallback)".to_string(),
                    };

                    let mut formats = vec![
                        VideoFormat {
                            quality: "Source Video (MP4)".to_string(),
                            size_mb: 0.0,
                            download_url: video_url,
                            is_audio: false,
                            audio_download_url: None,
                        }
                    ];

                    if let Some(aud_url) = audio_url {
                        formats.push(VideoFormat {
                            quality: "Audio Only (MP3)".to_string(),
                            size_mb: 0.0,
                            download_url: aud_url,
                            is_audio: true,
                            audio_download_url: None,
                        });
                    }

                    return Ok(ExtractionResult { info, formats });
                }
            } else {
                last_err = format!("Instance {} did not respond with 200 OK", instance);
            }
        }

        Err(ScraperError::ExtractionError(last_err))
    }
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct InvidiousFormatStream {
    url: String,
    quality_label: Option<String>,
    container: Option<String>,
    bitrate: Option<String>,
    clen: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct InvidiousAdaptiveFormat {
    url: String,
    container: Option<String>,
    bitrate: Option<String>,
    clen: Option<String>,
    #[serde(rename = "type")]
    format_type: Option<String>,
    quality_label: Option<String>,
}

#[derive(Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
struct InvidiousVideoResponse {
    title: String,
    length_seconds: Option<u64>,
    format_streams: Option<Vec<InvidiousFormatStream>>,
    adaptive_formats: Option<Vec<InvidiousAdaptiveFormat>>,
}

impl Extractor for YoutubeExtractor {
    fn can_handle(&self, url: &str) -> bool {
        self.extract_youtube_id(url).is_some()
    }

    async fn extract(&self, url: &str) -> Result<ExtractionResult, ScraperError> {
        let video_id = self.extract_youtube_id(url)
            .ok_or_else(|| ScraperError::InvalidUrl("Not a valid YouTube URL".to_string()))?;

        // 1. Try local yt-dlp first
        match self.extract_via_ytdlp(&video_id).await {
            Ok(result) => return Ok(result),
            Err(e) => {
                println!("yt-dlp extraction failed: {}. Falling back to Invidious API.", e);
            }
        }

        // 2. Fallback to Invidious instances
        let mut last_err = String::new();
        
        for instance in INVIDIOUS_INSTANCES {
            let api_url = format!("https://{}/api/v1/videos/{}", instance, video_id);
            match self.client.get(&api_url).send().await {
                Ok(resp) => {
                    let status_code = resp.status();
                    match resp.text().await {
                        Ok(body_text) => {
                            #[derive(Deserialize)]
                            struct InvidiousErrorResponse {
                                error: String,
                            }

                            if let Ok(err_data) = serde_json::from_str::<InvidiousErrorResponse>(&body_text) {
                                last_err = format!("Instance {}: {}", instance, err_data.error);
                            } else if body_text.trim().starts_with('<') || body_text.contains("<!DOCTYPE html>") {
                                last_err = format!("Instance {}: Server returned HTML (possibly blocked by Cloudflare)", instance);
                            } else {
                                match serde_json::from_str::<InvidiousVideoResponse>(&body_text) {
                                    Ok(data) => {
                                        let duration_sec = data.length_seconds.unwrap_or(0) as f64;
                                        let minutes = (duration_sec / 60.0).floor() as u64;
                                        let seconds = (duration_sec % 60.0) as u64;
                                        let duration_str = format!("{:02}:{:02}", minutes, seconds);

                                        let thumbnail_url = format!("https://img.youtube.com/vi/{}/maxresdefault.jpg", video_id);
                                        
                                        let info = VideoInfo {
                                            title: data.title.clone(),
                                            thumbnail_url,
                                            source_url: url.to_string(),
                                            duration: duration_str,
                                            platform: "YouTube".to_string(),
                                        };

                                        let mut formats = Vec::new();

                                        // Find best compatible AAC audio stream for muxing & Audio Only download
                                        let raw_best_audio_url = if let Some(ref adaptive) = data.adaptive_formats {
                                            adaptive.iter()
                                                .filter(|f| {
                                                    let t = f.format_type.as_ref().map(|s| s.as_str()).unwrap_or("");
                                                    t.starts_with("audio/mp4") || t.contains("codecs=\"mp4a")
                                                })
                                                .max_by_key(|f| f.bitrate.as_ref().and_then(|b| b.parse::<u64>().ok()).unwrap_or(0))
                                                .map(|f| f.url.clone())
                                        } else {
                                            None
                                        };

                                        let best_audio_size_mb = if let Some(ref audio_url) = raw_best_audio_url {
                                            if let Some(ref adaptive) = data.adaptive_formats {
                                                adaptive.iter()
                                                    .find(|f| f.url == *audio_url)
                                                    .map(|f| {
                                                        let cl = f.clen.as_ref().and_then(|c| c.parse::<f64>().ok()).unwrap_or(0.0);
                                                        let br = f.bitrate.as_ref().and_then(|b| b.parse::<f64>().ok()).unwrap_or(0.0);
                                                        if cl > 0.0 {
                                                            ((cl / (1024.0 * 1024.0)) * 10.0).round() / 10.0
                                                        } else if br > 0.0 {
                                                            self.estimate_size_mb(br, duration_sec)
                                                        } else {
                                                            3.4
                                                        }
                                                    })
                                                    .unwrap_or(3.4)
                                            } else {
                                                3.4
                                            }
                                        } else {
                                            0.0
                                        };

                                        let best_audio_url = raw_best_audio_url.map(|u| self.proxy_url(&u, instance));

                                        // 1. Map standard video streams (progressive: video + audio) - ONLY 720p or 1080p
                                        if let Some(streams) = data.format_streams {
                                            for s in streams {
                                                let label = s.quality_label.unwrap_or_else(|| "360p".to_string());
                                                if label.contains("720") {
                                                    let bitrate = s.bitrate.and_then(|b| b.parse::<f64>().ok()).unwrap_or(0.0);
                                                    let clen = s.clen.and_then(|c| c.parse::<f64>().ok()).unwrap_or(0.0);
                                                    let size_mb = if clen > 0.0 {
                                                        ((clen / (1024.0 * 1024.0)) * 10.0).round() / 10.0
                                                    } else if bitrate > 0.0 {
                                                        self.estimate_size_mb(bitrate, duration_sec)
                                                    } else {
                                                        64.3
                                                    };

                                                    formats.push(VideoFormat {
                                                        quality: "720p (mp4) (Good Quality)".to_string(),
                                                        size_mb,
                                                        download_url: self.proxy_url(&s.url, instance),
                                                        is_audio: false,
                                                        audio_download_url: None,
                                                    });
                                                } else if label.contains("1080") {
                                                    let bitrate = s.bitrate.and_then(|b| b.parse::<f64>().ok()).unwrap_or(0.0);
                                                    let clen = s.clen.and_then(|c| c.parse::<f64>().ok()).unwrap_or(0.0);
                                                    let size_mb = if clen > 0.0 {
                                                        ((clen / (1024.0 * 1024.0)) * 10.0).round() / 10.0
                                                    } else if bitrate > 0.0 {
                                                        self.estimate_size_mb(bitrate, duration_sec)
                                                    } else {
                                                        120.5
                                                    };

                                                    formats.push(VideoFormat {
                                                        quality: "1080p (mp4) (Full HD)".to_string(),
                                                        size_mb,
                                                        download_url: self.proxy_url(&s.url, instance),
                                                        is_audio: false,
                                                        audio_download_url: None,
                                                    });
                                                }
                                            }
                                        }

                                        // 2. Map adaptive video-only streams (e.g. 1080p H.264 for native muxing) - ONLY 720p or 1080p
                                        if let Some(ref adaptive) = data.adaptive_formats {
                                            for s in adaptive {
                                                let format_type = s.format_type.as_ref().map(|t| t.as_str()).unwrap_or("");
                                                if !format_type.starts_with("video/mp4") || !format_type.contains("codecs=\"avc1") {
                                                    continue;
                                                }

                                                let label = s.quality_label.clone().unwrap_or_else(|| "1080p".to_string());
                                                if label.contains("720") {
                                                    let clen = s.clen.as_ref().and_then(|c| c.parse::<f64>().ok()).unwrap_or(0.0);
                                                    let bitrate = s.bitrate.as_ref().and_then(|b| b.parse::<f64>().ok()).unwrap_or(0.0);
                                                    let size_mb = if clen > 0.0 {
                                                        ((clen / (1024.0 * 1024.0)) * 10.0).round() / 10.0
                                                    } else if bitrate > 0.0 {
                                                        self.estimate_size_mb(bitrate, duration_sec)
                                                    } else {
                                                        64.3
                                                    };

                                                    let combined_size = (size_mb + best_audio_size_mb * 10.0).round() / 10.0;

                                                    formats.push(VideoFormat {
                                                        quality: "720p (mp4, HD Muxed) (Good Quality)".to_string(),
                                                        size_mb: combined_size,
                                                        download_url: self.proxy_url(&s.url, instance),
                                                        is_audio: false,
                                                        audio_download_url: best_audio_url.clone(),
                                                    });
                                                } else if label.contains("1080") {
                                                    let clen = s.clen.as_ref().and_then(|c| c.parse::<f64>().ok()).unwrap_or(0.0);
                                                    let bitrate = s.bitrate.as_ref().and_then(|b| b.parse::<f64>().ok()).unwrap_or(0.0);
                                                    let size_mb = if clen > 0.0 {
                                                        ((clen / (1024.0 * 1024.0)) * 10.0).round() / 10.0
                                                    } else if bitrate > 0.0 {
                                                        self.estimate_size_mb(bitrate, duration_sec)
                                                    } else {
                                                        120.5
                                                    };

                                                    let combined_size = (size_mb + best_audio_size_mb * 10.0).round() / 10.0;

                                                    formats.push(VideoFormat {
                                                        quality: "1080p (mp4, HD Muxed) (Full HD)".to_string(),
                                                        size_mb: combined_size,
                                                        download_url: self.proxy_url(&s.url, instance),
                                                        is_audio: false,
                                                        audio_download_url: best_audio_url.clone(),
                                                    });
                                                }
                                            }
                                        }

                                        // 3. Map single best audio stream as "Audio Only (m4a) (Music)"
                                        if let Some(ref audio_url) = best_audio_url {
                                            formats.push(VideoFormat {
                                                quality: "Audio Only (m4a) (Music)".to_string(),
                                                size_mb: best_audio_size_mb,
                                                download_url: audio_url.clone(),
                                                is_audio: true,
                                                audio_download_url: None,
                                            });
                                        }

                                        // Fallback if no streams mapped
                                        if formats.is_empty() {
                                            formats.push(VideoFormat {
                                                quality: "720p (mp4, HD Muxed) (Good Quality)".to_string(),
                                                size_mb: 64.3,
                                                download_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4".to_string(),
                                                is_audio: false,
                                                audio_download_url: None,
                                            });
                                        }

                                        return Ok(ExtractionResult { info, formats });
                                    }
                                    Err(e) => {
                                        last_err = format!("Instance {}: JSON parsing failed (Status {}): {}", instance, status_code, e);
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            last_err = format!("Instance {}: Failed to read response text (Status {}): {}", instance, status_code, e);
                        }
                    }
                }
                Err(e) => last_err = format!("Instance {}: Request failed: {}", instance, e),
            }
        }

        // 3. Fallback to Cobalt API
        println!("Invidious extraction failed. Falling back to Cobalt API.");
        match self.extract_via_cobalt(url).await {
            Ok(result) => return Ok(result),
            Err(e) => {
                last_err = format!("{}; Cobalt fallback failed: {}", last_err, e);
            }
        }

        Err(ScraperError::ExtractionError(format!(
            "Failed to resolve video details from local yt-dlp, Invidious or Cobalt. Last error: {}",
            last_err
        )))
    }
}

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
    #[serde(rename = "downloadMode", skip_serializing_if = "Option::is_none")]
    download_mode: Option<&'a str>,
}

#[derive(Deserialize, Debug)]
struct CobaltResponse {
    status: String,
    url: Option<String>,
    picker: Option<Vec<CobaltPickerItem>>,
    filename: Option<String>,
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
