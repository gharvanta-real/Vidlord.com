use std::pin::Pin;
use std::task::{Context, Poll};
use futures::Stream;

pub struct CancelableStream<S> {
    pub inner: S,
    pub handle: tokio::task::JoinHandle<()>,
    pub output_path: String,
    pub completed: std::sync::Arc<std::sync::atomic::AtomicBool>,
}

impl<S> Drop for CancelableStream<S> {
    fn drop(&mut self) {
        println!("SSE client disconnected. Aborting download task.");
        self.handle.abort();
        if !self.completed.load(std::sync::atomic::Ordering::SeqCst) {
            println!("SSE client disconnected before completion. Deleting partial file: {}", self.output_path);
            let _ = std::fs::remove_file(&self.output_path);
            // Also clean up any temporary part files if it was an HTTP chunked download
            for i in 0..16 {
                let _ = std::fs::remove_file(format!("{}.part{}", self.output_path, i));
            }
            let _ = std::fs::remove_file(format!("{}.video.tmp", self.output_path));
            let _ = std::fs::remove_file(format!("{}.audio.tmp", self.output_path));
        }
    }
}

impl<S> Stream for CancelableStream<S>
where
    S: Stream + Unpin,
{
    type Item = S::Item;

    fn poll_next(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        Pin::new(&mut self.inner).poll_next(cx)
    }
}

pub struct AuditStream<S> {
    pub inner: S,
    pub url: String,
    pub filename: String,
    pub client_ip: String,
    pub bytes_written: u64,
    pub content_length: Option<u64>,
    pub logged_started: bool,
    pub logged_finished: bool,
}

impl<S> Drop for AuditStream<S> {
    fn drop(&mut self) {
        if self.logged_started && !self.logged_finished {
            let is_completed = if let Some(len) = self.content_length {
                self.bytes_written >= len
            } else {
                self.bytes_written > 0
            };

            if is_completed {
                log_audit_event(
                    "completed",
                    &self.url,
                    &self.filename,
                    None,
                    &self.client_ip,
                    Some(self.bytes_written),
                );
            } else {
                log_audit_event(
                    "failed",
                    &self.url,
                    &self.filename,
                    Some("Connection closed prematurely by client"),
                    &self.client_ip,
                    None,
                );
            }
        }
    }
}

impl<S> Stream for AuditStream<S>
where
    S: Stream<Item = Result<axum::body::Bytes, reqwest::Error>> + Unpin,
{
    type Item = Result<axum::body::Bytes, reqwest::Error>;

    fn poll_next(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<Self::Item>> {
        if !self.logged_started {
            self.logged_started = true;
            log_audit_event("started", &self.url, &self.filename, None, &self.client_ip, None);
        }

        match Pin::new(&mut self.inner).poll_next(cx) {
            Poll::Ready(Some(Ok(bytes))) => {
                self.bytes_written += bytes.len() as u64;
                Poll::Ready(Some(Ok(bytes)))
            }
            Poll::Ready(Some(Err(e))) => {
                self.logged_finished = true;
                let err_str = e.to_string();
                log_audit_event("failed", &self.url, &self.filename, Some(&err_str), &self.client_ip, None);
                Poll::Ready(Some(Err(e)))
            }
            Poll::Ready(None) => {
                self.logged_finished = true;
                log_audit_event("completed", &self.url, &self.filename, None, &self.client_ip, Some(self.bytes_written));
                Poll::Ready(None)
            }
            Poll::Pending => Poll::Pending,
        }
    }
}

pub async fn is_safe_url(url_str: &str) -> bool {
    let parsed = match reqwest::Url::parse(url_str) {
        Ok(url) => url,
        Err(_) => return false,
    };
    
    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return false;
    }

    let host = match parsed.host_str() {
        Some(h) => h,
        None => return false,
    };

    let port = parsed.port().unwrap_or(if scheme == "https" { 443 } else { 80 });
    let addr_str = format!("{}:{}", host, port);

    let mut addrs = match tokio::net::lookup_host(&addr_str).await {
        Ok(a) => a,
        Err(_) => return false,
    };

    while let Some(addr) = addrs.next() {
        let ip = addr.ip();
        if ip.is_loopback() || ip.is_unspecified() {
            return false;
        }
        if let std::net::IpAddr::V4(ipv4) = ip {
            if ipv4.is_private() || ipv4.is_link_local() || ipv4.is_broadcast() {
                return false;
            }
        } else if let std::net::IpAddr::V6(ipv6) = ip {
            let octets = ipv6.octets();
            // fc00::/7 (unique local address)
            if (octets[0] & 0xfe) == 0xfc {
                return false;
            }
            // fe80::/10 (link-local)
            if octets[0] == 0xfe && (octets[1] & 0xc0) == 0x80 {
                return false;
            }
        }
    }
    true
}

pub fn log_audit_event(
    event_type: &str,
    url: &str,
    file_name: &str,
    error: Option<&str>,
    client_ip: &str,
    size: Option<u64>,
) {
    let log_file_path = "./downloads_audit.jsonl";
    let timestamp = chrono::Utc::now().to_rfc3339();
    
    let log_entry = serde_json::json!({
        "timestamp": timestamp,
        "event": event_type,
        "url": url,
        "filename": file_name,
        "client_ip": client_ip,
        "error": error,
        "size": size,
    });
    
    let log_line = format!("{}\n", log_entry.to_string());
    
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .write(true)
        .append(true)
        .open(log_file_path)
    {
        use std::io::Write;
        let _ = file.write_all(log_line.as_bytes());
    }
}

pub fn spawn_cleanup_task() {
    tokio::spawn(async {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            if let Ok(entries) = std::fs::read_dir("./downloads") {
                for entry in entries.flatten() {
                    if let Ok(metadata) = entry.metadata() {
                        if metadata.is_file() {
                            if let Ok(modified) = metadata.modified() {
                                if let Ok(elapsed) = modified.elapsed() {
                                    if elapsed.as_secs() > 600 { // 10 minutes
                                        let path = entry.path();
                                        if let Err(e) = std::fs::remove_file(&path) {
                                            eprintln!("Failed to auto-delete expired download file {:?}: {}", path, e);
                                        } else {
                                            println!("Auto-deleted expired download file: {:?}", path);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}
