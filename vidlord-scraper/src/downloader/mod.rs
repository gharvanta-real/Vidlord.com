pub mod hls;
pub mod http;
pub mod muxer;

use crate::errors::ScraperError;
use serde::{Serialize, Deserialize};

pub trait Downloader: Send + Sync {
    async fn download<F>(&self, url: &str, output_path: &str, progress_callback: F) -> Result<(), ScraperError>
    where
        F: Fn(f64, f64) + Send + Sync + 'static;
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "progress_type", rename_all = "lowercase")]
pub enum DownloadProgress {
    Video { current: f64, total: f64 },
    Audio { current: f64, total: f64 },
    Muxing,
}

/// Helper function to automatically route, download and merge video & audio streams.
pub async fn download_stream<F>(
    url: &str,
    audio_url: Option<&str>,
    output_path: &str,
    progress_callback: F,
) -> Result<(), ScraperError>
where
    F: Fn(DownloadProgress) + Send + Sync + 'static + Clone,
{
    match audio_url {
        Some(a_url) => {
            let temp_video_path = format!("{}.video.tmp", output_path);
            let temp_audio_path = format!("{}.audio.tmp", output_path);

            // 1. Download video
            let p_cb_v = progress_callback.clone();
            let video_cb = move |current, total| {
                p_cb_v(DownloadProgress::Video { current, total });
            };
            download_single_stream(url, &temp_video_path, video_cb).await?;

            // 2. Download audio
            let p_cb_a = progress_callback.clone();
            let audio_cb = move |current, total| {
                p_cb_a(DownloadProgress::Audio { current, total });
            };
            download_single_stream(a_url, &temp_audio_path, audio_cb).await?;

            // 3. Mux/Merge
            progress_callback(DownloadProgress::Muxing);
            muxer::merge_mp4_m4a(&temp_video_path, &temp_audio_path, output_path)?;

            // 4. Cleanup
            let _ = std::fs::remove_file(&temp_video_path);
            let _ = std::fs::remove_file(&temp_audio_path);

            Ok(())
        }
        None => {
            let video_cb = move |current, total| {
                progress_callback(DownloadProgress::Video { current, total });
            };
            download_single_stream(url, output_path, video_cb).await
        }
    }
}

async fn download_single_stream<F>(url: &str, output_path: &str, progress_callback: F) -> Result<(), ScraperError>
where
    F: Fn(f64, f64) + Send + Sync + 'static,
{
    let lower = url.to_lowercase();
    let is_hls = lower.contains(".m3u8") 
        || lower.contains("m3u8") 
        || lower.contains(".txt") 
        || lower.contains("master.txt") 
        || lower.contains("-v1-a1.txt") 
        || lower.contains("hls3") 
        || lower.contains("4flhlv");

    if is_hls {
        let downloader = hls::HlsDownloader::new(8);
        downloader.download(url, output_path, progress_callback).await
    } else {
        let downloader = http::HttpDownloader::new();
        downloader.download(url, output_path, progress_callback).await
    }
}
