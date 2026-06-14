use std::collections::BTreeMap;
use std::fs::File;
use std::io::Write;
use std::time::Duration;
use reqwest::{Client, Url};
use futures::stream::{self, StreamExt};
use crate::errors::ScraperError;
use super::Downloader;

pub struct HlsDownloader {
    client: Client,
    concurrency: usize,
}

impl HlsDownloader {
    pub fn new(concurrency: usize) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(12))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .danger_accept_invalid_certs(true)
            .build()
            .unwrap_or_default();
        Self { client, concurrency }
    }

    fn parse_m3u8(&self, body: &str) -> Vec<String> {
        body.lines()
            .map(|l| l.trim())
            .filter(|l| !l.is_empty() && !l.starts_with('#'))
            .map(|l| l.to_string())
            .collect()
    }

    fn resolve_url(&self, base: &str, relative: &str) -> Result<String, ScraperError> {
        if relative.starts_with("http://") || relative.starts_with("https://") {
            Ok(relative.to_string())
        } else {
            let base_url = Url::parse(base)
                .map_err(|e| ScraperError::InvalidUrl(format!("Invalid base URL: {}", e)))?;
            let resolved = base_url.join(relative)
                .map_err(|e| ScraperError::InvalidUrl(format!("Failed to resolve segment URL: {}", e)))?;
            Ok(resolved.to_string())
        }
    }
}

impl Downloader for HlsDownloader {
    async fn download<F>(&self, playlist_url: &str, output_path: &str, progress_callback: F) -> Result<(), ScraperError>
    where
        F: Fn(f64, f64) + Send + Sync + 'static,
    {
        // Determine referer for playlist and segments
        let referer_val = if playlist_url.contains("surrit.com") || playlist_url.contains("missav") {
            Some("https://missav.ws/".to_string())
        } else if let Ok(parsed_url) = reqwest::Url::parse(playlist_url) {
            if let Some(host) = parsed_url.host_str() {
                Some(format!("{}://{}/", parsed_url.scheme(), host))
            } else {
                None
            }
        } else {
            None
        };

        // 1. Fetch playlist
        let mut playlist_req = self.client.get(playlist_url);
        if let Some(ref ref_str) = referer_val {
            playlist_req = playlist_req.header(reqwest::header::REFERER, ref_str);
        }
        let resp = playlist_req.send().await
            .map_err(|e| ScraperError::NetworkError(format!("Playlist fetch failed: {}", e)))?;
            
        if resp.status() != 200 {
            return Err(ScraperError::NetworkError(format!("Server returned HTTP {}", resp.status())));
        }

        let body = resp.text().await
            .map_err(|e| ScraperError::ExtractionError(format!("Failed to read playlist content: {}", e)))?;

        // 2. Parse segments
        let raw_segments = self.parse_m3u8(&body);
        if raw_segments.is_empty() {
            return Err(ScraperError::ExtractionError("No segments found in playlist".to_string()));
        }

        let mut segments = Vec::new();
        for s in raw_segments {
            segments.push(self.resolve_url(playlist_url, &s)?);
        }

        let total_segments = segments.len();
        
        // 3. Setup sliding window concurrent downloader
        let client = self.client.clone();
        let referer_clone = referer_val.clone();
        let segment_futures = segments.into_iter().enumerate().map(|(idx, url)| {
            let client = client.clone();
            let referer_clone = referer_clone.clone();
            async move {
                let mut builder = client.get(&url);
                if let Some(ref ref_str) = referer_clone {
                    builder = builder.header(reqwest::header::REFERER, ref_str);
                }
                let bytes = builder.send().await?
                    .bytes().await?;
                Ok::<_, reqwest::Error>((idx, bytes))
            }
        });

        let mut stream = stream::iter(segment_futures)
            .buffer_unordered(self.concurrency);

        let mut file = File::create(output_path)?;
        let mut buffered_segments = BTreeMap::new();
        let mut next_write_idx = 0;

        // 4. Download and stitch segments in-order
        while let Some(res) = stream.next().await {
            let (idx, bytes) = res
                .map_err(|e| ScraperError::NetworkError(format!("Segment download failed: {}", e)))?;
            
            buffered_segments.insert(idx, bytes);

            // Write contiguous segments that have arrived
            while let Some(bytes) = buffered_segments.remove(&next_write_idx) {
                file.write_all(&bytes)?;
                next_write_idx += 1;
                progress_callback(next_write_idx as f64, total_segments as f64);
            }
        }

        if next_write_idx != total_segments {
            return Err(ScraperError::DownloadError(format!(
                "Downloaded only {}/{} segments",
                next_write_idx, total_segments
            )));
        }

        file.flush()?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_m3u8_parsing() {
        let downloader = HlsDownloader::new(4);
        let playlist = "#EXTM3U\n#EXT-X-VERSION:3\n#EXTINF:10.0,\nsegment1.ts\n#EXTINF:10.0,\nsegment2.ts\n";
        let segments = downloader.parse_m3u8(playlist);
        assert_eq!(segments.len(), 2);
        assert_eq!(segments[0], "segment1.ts");
        assert_eq!(segments[1], "segment2.ts");
    }

    #[test]
    fn test_url_resolution() {
        let downloader = HlsDownloader::new(4);
        let base = "https://example.com/live/playlist.m3u8";
        let relative = "segment1.ts";
        let absolute = "https://other-cdn.com/seg.ts";
        
        let resolved_rel = downloader.resolve_url(base, relative).unwrap();
        let resolved_abs = downloader.resolve_url(base, absolute).unwrap();
        
        assert_eq!(resolved_rel, "https://example.com/live/segment1.ts");
        assert_eq!(resolved_abs, "https://other-cdn.com/seg.ts");
    }
}
