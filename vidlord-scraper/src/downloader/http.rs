use std::fs::File;
use std::io::Write;
use reqwest::Client;
use futures::StreamExt;
use crate::errors::ScraperError;
use super::Downloader;

pub struct HttpDownloader {
    client: Client,
}

impl HttpDownloader {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .danger_accept_invalid_certs(true)
            .build()
            .unwrap_or_default();
        Self { client }
    }
}

impl Downloader for HttpDownloader {
    async fn download<F>(&self, url: &str, output_path: &str, progress_callback: F) -> Result<(), ScraperError>
    where
        F: Fn(f64, f64) + Send + Sync + 'static,
    {
        let referer_val = if url.contains("surrit.com") || url.contains("missav") {
            Some("https://missav.ws/".to_string())
        } else if url.contains("wowstream") {
            Some("https://wowstream.cloud/".to_string())
        } else if url.contains("javhd.com") || url.contains("javhd.today") || url.contains("javhd") || url.contains("index-v1-a1.txt") || url.contains("master.txt") || url.contains("hls3") || url.contains("4flhlv") {
            Some("https://4flhlv.com/".to_string())
        } else if url.contains("instagram") || url.contains("cdninstagram") {
            Some("https://www.instagram.com/".to_string())
        } else if url.contains("facebook") || url.contains("fbcdn") || url.contains("fb.watch") {
            Some("https://www.facebook.com/".to_string())
        } else if url.contains("twitter") || url.contains("x.com") {
            Some("https://x.com/".to_string())
        } else if url.contains("googlevideo.com") || url.contains("youtube") {
            Some("https://www.youtube.com/".to_string())
        } else if let Ok(parsed_url) = reqwest::Url::parse(url) {
            if let Some(host) = parsed_url.host_str() {
                Some(format!("{}://{}/", parsed_url.scheme(), host))
            } else {
                None
            }
        } else {
            None
        };

        // 1. Initial request with Range: bytes=0-0 to check if server supports range requests
        let mut probe_req = self.client.get(url)
            .header(reqwest::header::RANGE, "bytes=0-0");
        if let Some(ref ref_str) = referer_val {
            probe_req = probe_req.header(reqwest::header::REFERER, ref_str);
        }
        let init_resp = probe_req
            .send()
            .await
            .map_err(|e| ScraperError::NetworkError(format!("Initial server probe failed: {}", e)))?;

        let mut accept_ranges = false;
        let mut content_length = 0u64;

        // Force single-connection for Invidious proxy URLs to prevent rate-limiting/blocking
        let is_invidious = url.contains("latest_version") 
            || url.contains("invidious") 
            || url.contains("melmac.space") 
            || url.contains("projectsegfau.lt")
            || url.contains("yewtu.be")
            || (url.contains("/videoplayback") && !url.contains("googlevideo.com") && !url.contains("youtube.com"));

        if !is_invidious {
            if init_resp.status() == reqwest::StatusCode::PARTIAL_CONTENT {
                accept_ranges = true;
                if let Some(content_range) = init_resp.headers().get(reqwest::header::CONTENT_RANGE) {
                    if let Some(range_str) = content_range.to_str().ok() {
                        if let Some(slash_idx) = range_str.rfind('/') {
                            if let Ok(len) = range_str[slash_idx + 1..].parse::<u64>() {
                                content_length = len;
                            }
                        }
                    }
                }
            } else if init_resp.status().is_success() {
                // Server returned 200 OK (doesn't support range requests, or ignored it)
                if let Some(len_str) = init_resp.headers().get(reqwest::header::CONTENT_LENGTH) {
                    if let Ok(len) = len_str.to_str().unwrap_or_default().parse::<u64>() {
                        content_length = len;
                    }
                }
            }
        } else {
            // Still parse content length for progress if available
            if let Some(len_str) = init_resp.headers().get(reqwest::header::CONTENT_LENGTH) {
                if let Ok(len) = len_str.to_str().unwrap_or_default().parse::<u64>() {
                    content_length = len;
                }
            }
        }

        let min_chunk_size = 1024 * 1024; // 1MB minimum segment size
        let mut num_chunks = 16; // Up to 16 concurrent threads
        if content_length < min_chunk_size * num_chunks {
            num_chunks = content_length / min_chunk_size;
        }
        if num_chunks < 2 {
            num_chunks = 1;
        }

        // 2. Perform segmented concurrent download if supported and size is large enough
        if accept_ranges && num_chunks > 1 {
            if content_length > 3 * 1024 * 1024 * 1024 {
                return Err(ScraperError::DownloadError("Video size exceeds 3 GB limit".to_string()));
            }
            let chunk_size = content_length / num_chunks;
            let mut tasks = Vec::new();
            let downloaded_bytes = std::sync::Arc::new(std::sync::atomic::AtomicU64::new(0));
            let progress_callback = std::sync::Arc::new(progress_callback);

            // Clean up any stale part files from previous aborted runs to prevent corruption
            for i in 0..num_chunks {
                let _ = std::fs::remove_file(format!("{}.part{}", output_path, i));
            }

            for i in 0..num_chunks {
                let start = i * chunk_size;
                let end = if i == num_chunks - 1 {
                    content_length - 1
                } else {
                    (i + 1) * chunk_size - 1
                };

                let client = self.client.clone();
                let url = url.to_string();
                let part_path = format!("{}.part{}", output_path, i);
                let downloaded_bytes = downloaded_bytes.clone();
                let progress_callback = progress_callback.clone();

                let referer_clone = referer_val.clone();
                let task = tokio::spawn(async move {
                    let part_file_path = part_path.clone();
                    let mut retries = 3;
                    let mut downloaded_in_segment = 0u64;

                    loop {
                        let req_start = start + downloaded_in_segment;
                        if req_start > end {
                            break;
                        }

                        // Open file in append/write mode
                        let mut file = if std::path::Path::new(&part_file_path).exists() {
                            std::fs::OpenOptions::new().write(true).append(true).open(&part_file_path)
                        } else {
                            File::create(&part_file_path)
                        }.map_err(|e| ScraperError::IoError(e))?;

                        let mut req = client.get(&url)
                            .header(reqwest::header::RANGE, format!("bytes={}-{}", req_start, end));
                        if let Some(ref ref_str) = referer_clone {
                            req = req.header(reqwest::header::REFERER, ref_str);
                        }
                        
                        match req.send().await {
                            Ok(resp) if resp.status() == reqwest::StatusCode::PARTIAL_CONTENT => {
                                let mut stream = resp.bytes_stream();
                                let mut failed = false;

                                while let Some(chunk_res) = stream.next().await {
                                    match chunk_res {
                                        Ok(chunk) => {
                                            if let Err(e) = file.write_all(&chunk) {
                                                return Err(ScraperError::IoError(e));
                                            }
                                            let chunk_len = chunk.len() as u64;
                                            downloaded_in_segment += chunk_len;
                                            
                                            let total_so_far = downloaded_bytes.fetch_add(chunk_len, std::sync::atomic::Ordering::SeqCst) + chunk_len;
                                            progress_callback(total_so_far as f64, content_length as f64);
                                        }
                                        Err(_) => {
                                            failed = true;
                                            break;
                                        }
                                    }
                                }

                                if !failed {
                                    // Segment fully downloaded!
                                    break;
                                }
                            }
                            Ok(resp) => {
                                // HTTP failure status
                                if resp.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
                                    // Rate limited, sleep longer
                                    tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
                                }
                            }
                            Err(_) => {}
                        }

                        retries -= 1;
                        if retries == 0 {
                            return Err(ScraperError::DownloadError("Segment download failed after multiple retries".to_string()));
                        }
                        // Sleep for a short moment before retrying
                        tokio::time::sleep(std::time::Duration::from_millis(800)).await;
                    }

                    Ok(part_file_path)
                });
                tasks.push(task);
            }

            // Wait for all tasks to complete
            let results = futures::future::join_all(tasks).await;
            let mut part_paths = Vec::new();
            for res in results {
                match res {
                    Ok(Ok(path)) => part_paths.push(path),
                    Ok(Err(e)) => {
                        // Cleanup temporary parts on error
                        for i in 0..num_chunks {
                            let _ = std::fs::remove_file(format!("{}.part{}", output_path, i));
                        }
                        return Err(e);
                    }
                    Err(e) => {
                        // Task join error
                        for i in 0..num_chunks {
                            let _ = std::fs::remove_file(format!("{}.part{}", output_path, i));
                        }
                        return Err(ScraperError::DownloadError(format!("Task join failed: {}", e)));
                    }
                }
            }

            // Concatenate all parts sequentially into the final file
            let mut final_file = File::create(output_path)
                .map_err(|e| ScraperError::IoError(e))?;

            for part_path in &part_paths {
                let mut part_file = File::open(part_path)
                    .map_err(|e| ScraperError::IoError(e))?;
                std::io::copy(&mut part_file, &mut final_file)
                    .map_err(|e| ScraperError::IoError(e))?;
            }
            final_file.flush().map_err(|e| ScraperError::IoError(e))?;

            // Delete temporary parts
            for part_path in part_paths {
                let _ = std::fs::remove_file(part_path);
            }

            Ok(())
        } else {
            // 3. Fallback to standard single-connection download
            let mut req = self.client.get(url);
            if let Some(ref ref_str) = referer_val {
                req = req.header(reqwest::header::REFERER, ref_str);
            }
            let resp = req.send().await
                .map_err(|e| ScraperError::NetworkError(format!("HTTP request failed: {}", e)))?;

            if !resp.status().is_success() {
                return Err(ScraperError::NetworkError(format!("Server returned HTTP {}", resp.status())));
            }

            let total_size = resp.content_length().unwrap_or(0) as f64;
            if total_size > 3.0 * 1024.0 * 1024.0 * 1024.0 {
                return Err(ScraperError::DownloadError("Video size exceeds 3 GB limit".to_string()));
            }
            let mut file = File::create(output_path)
                .map_err(|e| ScraperError::IoError(e))?;
            
            let mut downloaded = 0.0;
            let mut stream = resp.bytes_stream();

            while let Some(chunk_result) = stream.next().await {
                let chunk = chunk_result.map_err(|e| ScraperError::DownloadError(format!("Chunk download failed: {}", e)))?;
                file.write_all(&chunk)
                    .map_err(|e| ScraperError::IoError(e))?;
                downloaded += chunk.len() as f64;
                
                if downloaded > 3.0 * 1024.0 * 1024.0 * 1024.0 {
                    return Err(ScraperError::DownloadError("Video size exceeds 3 GB limit".to_string()));
                }
                
                if total_size > 0.0 {
                    progress_callback(downloaded, total_size);
                } else {
                    progress_callback(downloaded, downloaded);
                }
            }

            file.flush().map_err(|e| ScraperError::IoError(e))?;
            Ok(())
        }
    }
}
