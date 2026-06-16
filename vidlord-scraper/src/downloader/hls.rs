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
            .connect_timeout(Duration::from_secs(15))
            .timeout(Duration::from_secs(60))
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

    fn get_media_playlist_url(&self, body: &str, base_url: &str) -> Option<String> {
        if !body.contains("#EXT-X-STREAM-INF") {
            return None;
        }

        let mut streams = Vec::new();
        let mut current_stream_inf = None;

        for line in body.lines() {
            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }
            if trimmed.starts_with("#EXT-X-STREAM-INF:") {
                current_stream_inf = Some(trimmed.to_string());
            } else if !trimmed.starts_with('#') {
                if let Some(inf) = current_stream_inf.take() {
                    streams.push((inf, trimmed.to_string()));
                }
            }
        }

        if streams.is_empty() {
            return None;
        }

        let mut best_url = streams[0].1.clone();
        let mut max_bandwidth = 0u64;

        for (inf, url) in streams {
            if let Some(bw_idx) = inf.find("BANDWIDTH=") {
                let rest = &inf[bw_idx + 10..];
                let end_idx = rest.find(',').unwrap_or(rest.len());
                if let Ok(bw) = rest[..end_idx].parse::<u64>() {
                    if bw > max_bandwidth {
                        max_bandwidth = bw;
                        best_url = url;
                    }
                }
            }
        }

        self.resolve_url(base_url, &best_url).ok()
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
        } else if playlist_url.contains("wowstream") {
            Some("https://wowstream.cloud/".to_string())
        } else if playlist_url.contains("javhd.com") || playlist_url.contains("javhd.today") || playlist_url.contains("javhd") || playlist_url.contains("index-v1-a1.txt") || playlist_url.contains("master.txt") || playlist_url.contains("hls3") || playlist_url.contains("4flhlv") {
            Some("https://4flhlv.com/".to_string())
        } else if let Ok(parsed_url) = reqwest::Url::parse(playlist_url) {
            if let Some(host) = parsed_url.host_str() {
                Some(format!("{}://{}/", parsed_url.scheme(), host))
            } else {
                None
            }
        } else {
            None
        };

        // 1. Fetch playlist (recursively resolve Master Playlists to Media Playlists)
        let mut current_url = playlist_url.to_string();
        let mut body = String::new();
        let mut depth = 0;

        loop {
            if depth >= 5 {
                return Err(ScraperError::ExtractionError("Too many nested playlists".to_string()));
            }
            let mut retries = 5;
            let mut delay_ms = 500;
            let mut resp = None;
            let mut attempt = 0;
            const USER_AGENTS: &[&str] = &[
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
            ];

            while retries > 0 {
                let ua = USER_AGENTS[attempt % USER_AGENTS.len()];
                attempt += 1;
                
                let mut req = self.client.get(&current_url)
                    .header(reqwest::header::USER_AGENT, ua);
                if let Some(ref ref_str) = referer_val {
                    req = req.header(reqwest::header::REFERER, ref_str);
                }
                
                match req.send().await {
                    Ok(r) => {
                        let status = r.status();
                        if status == 200 {
                            resp = Some(r);
                            break;
                        } else {
                            retries -= 1;
                            if retries == 0 {
                                return Err(ScraperError::NetworkError(format!("Server returned HTTP {}", status)));
                            }
                            tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                            delay_ms *= 2;
                        }
                    }
                    Err(e) => {
                        retries -= 1;
                        if retries == 0 {
                            return Err(ScraperError::NetworkError(format!("Playlist fetch failed: {}", e)));
                        }
                        tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
                        delay_ms *= 2;
                    }
                }
            }

            let resp = resp.unwrap();

            let content = resp.text().await
                .map_err(|e| ScraperError::ExtractionError(format!("Failed to read playlist content: {}", e)))?;

            if let Some(sub_url) = self.get_media_playlist_url(&content, &current_url) {
                current_url = sub_url;
                depth += 1;
            } else {
                body = content;
                break;
            }
        }

        // 2. Parse segments
        let raw_segments = self.parse_m3u8(&body);
        if raw_segments.is_empty() {
            return Err(ScraperError::ExtractionError("No segments found in playlist".to_string()));
        }

        let mut segments = Vec::new();
        for s in raw_segments {
            segments.push(self.resolve_url(&current_url, &s)?);
        }

        let total_segments = segments.len();
        
        // 3. Setup sliding window concurrent downloader
        let client = self.client.clone();
        let referer_clone = referer_val.clone();
        let segment_futures = segments.into_iter().enumerate().map(|(idx, url)| {
            let client = client.clone();
            let referer_clone = referer_clone.clone();
            async move {
                let mut retries = 5;
                let mut delay = Duration::from_secs(1);
                loop {
                    let mut builder = client.get(&url);
                    if let Some(ref ref_str) = referer_clone {
                        builder = builder.header(reqwest::header::REFERER, ref_str);
                    }
                    let res = match builder.send().await {
                        Ok(resp) => {
                            if resp.status().is_success() {
                                resp.bytes().await
                            } else {
                                Err(resp.error_for_status().unwrap_err())
                            }
                        }
                        Err(e) => Err(e),
                    };

                    match res {
                        Ok(bytes) => return Ok::<_, reqwest::Error>((idx, bytes)),
                        Err(e) => {
                            retries -= 1;
                            if retries == 0 {
                                return Err(e);
                            }
                            eprintln!("Segment {} download failed: {}. Retrying in {:?}... ({} retries left)", idx, e, delay, retries);
                            tokio::time::sleep(delay).await;
                            delay *= 2;
                        }
                    }
                }
            }
        });

        let mut stream = stream::iter(segment_futures)
            .buffer_unordered(self.concurrency);

        let mut file = File::create(output_path)?;
        let mut buffered_segments = BTreeMap::new();
        let mut next_write_idx = 0;
        let mut total_downloaded_bytes = 0u64;

        // 4. Download and stitch segments in-order
        while let Some(res) = stream.next().await {
            let (idx, bytes) = res
                .map_err(|e| ScraperError::NetworkError(format!("Segment download failed: {}", e)))?;
            
            buffered_segments.insert(idx, bytes);

            // Write contiguous segments that have arrived
            while let Some(bytes) = buffered_segments.remove(&next_write_idx) {
                let bytes_len = bytes.len();
                file.write_all(&bytes)?;
                next_write_idx += 1;
                total_downloaded_bytes += bytes_len as u64;

                if total_downloaded_bytes > 3 * 1024 * 1024 * 1024 {
                    return Err(ScraperError::DownloadError("Video size exceeds 3 GB limit".to_string()));
                }

                let avg_segment_size = total_downloaded_bytes as f64 / next_write_idx as f64;
                let estimated_total_bytes = avg_segment_size * total_segments as f64;
                progress_callback(total_downloaded_bytes as f64, estimated_total_bytes);
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
