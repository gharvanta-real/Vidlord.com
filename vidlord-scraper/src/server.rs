use axum::{
    routing::{get, post},
    Router,
    Json,
    extract::Query,
    response::{sse::{Event, KeepAlive, Sse}, IntoResponse},
    http::{StatusCode, HeaderMap, HeaderValue},
};
use tower_http::cors::CorsLayer;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use crate::extractor::extract_video_details;
use crate::downloader::download_stream;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use tokio_stream::StreamExt;
use std::convert::Infallible;

#[derive(Deserialize)]
pub struct ExtractRequest {
    pub url: String,
}

#[derive(Deserialize)]
pub struct DownloadQuery {
    pub url: String,
    pub output_path: String,
    pub audio_url: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum ProgressMessage {
    Downloading {
        stage: String,
        current: f64,
        total: f64,
        percentage: f64,
    },
    Muxing,
    Completed,
    Error {
        message: String,
    },
}

async fn is_safe_url(url_str: &str) -> bool {
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

async fn handle_extract(
    Json(payload): Json<ExtractRequest>,
) -> Result<Json<crate::extractor::ExtractionResult>, (axum::http::StatusCode, String)> {
    if !is_safe_url(&payload.url).await {
        return Err((
            axum::http::StatusCode::BAD_REQUEST,
            "URL is unsafe or resolves to a private/loopback address".to_string(),
        ));
    }

    match extract_video_details(&payload.url).await {
        Ok(result) => Ok(Json(result)),
        Err(e) => Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Extraction failed: {}", e),
        )),
    }
}

fn log_audit_event(
    event_type: &str,
    url: &str,
    file_name: &str,
    error: Option<&str>,
    client_ip: &str,
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

async fn handle_download(
    headers: HeaderMap,
    Query(query): Query<DownloadQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if !is_safe_url(&query.url).await {
        return Err((
            StatusCode::BAD_REQUEST,
            "Video URL is unsafe or resolves to a private/loopback address".to_string(),
        ));
    }
    if let Some(ref audio_url) = query.audio_url {
        if !is_safe_url(audio_url).await {
            return Err((
                StatusCode::BAD_REQUEST,
                "Audio URL is unsafe or resolves to a private/loopback address".to_string(),
            ));
        }
    }

    // Path Traversal mitigation: extract filename component only and prepend ./downloads/
    let file_name = std::path::Path::new(&query.output_path)
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("video.mp4")
        .to_string();
    let safe_output_path = format!("./downloads/{}", file_name);

    let client_ip = headers.get("x-real-ip")
        .or_else(|| headers.get("x-forwarded-for"))
        .and_then(|h| h.to_str().ok())
        .unwrap_or("unknown")
        .to_string();

    log_audit_event("started", &query.url, &file_name, None, &client_ip);

    let (tx, rx) = mpsc::channel(100);

    let url_clone = query.url.clone();
    let file_name_clone = file_name.clone();
    let client_ip_clone = client_ip.clone();

    // Spawn download asynchronously in the background
    tokio::spawn(async move {
        let tx_clone = tx.clone();
        
        let progress_cb = move |progress| {
            let msg = match progress {
                crate::downloader::DownloadProgress::Video { current, total } => {
                    let percentage = if total > 0.0 { (current / total) * 100.0 } else { 0.0 };
                    ProgressMessage::Downloading {
                        stage: "video".to_string(),
                        current,
                        total,
                        percentage: (percentage * 10.0).round() / 10.0,
                    }
                }
                crate::downloader::DownloadProgress::Audio { current, total } => {
                    let percentage = if total > 0.0 { (current / total) * 100.0 } else { 0.0 };
                    ProgressMessage::Downloading {
                        stage: "audio".to_string(),
                        current,
                        total,
                        percentage: (percentage * 10.0).round() / 10.0,
                    }
                }
                crate::downloader::DownloadProgress::Muxing => {
                    ProgressMessage::Muxing
                }
            };
            let _ = tx_clone.try_send(msg);
        };

        let audio_url_ref = query.audio_url.as_deref();
        match download_stream(&query.url, audio_url_ref, &safe_output_path, progress_cb).await {
            Ok(()) => {
                log_audit_event("completed", &url_clone, &file_name_clone, None, &client_ip_clone);
                let _ = tx.send(ProgressMessage::Completed).await;
            }
            Err(e) => {
                let err_str = e.to_string();
                log_audit_event("failed", &url_clone, &file_name_clone, Some(&err_str), &client_ip_clone);
                let _ = tx.send(ProgressMessage::Error { message: err_str }).await;
            }
        }
    });

    let stream = ReceiverStream::new(rx).map(|msg| {
        let json_str = serde_json::to_string(&msg).unwrap_or_default();
        Ok::<Event, Infallible>(Event::default().data(json_str))
    });

    Ok(Sse::new(stream).keep_alive(KeepAlive::default()))
}

#[derive(Deserialize)]
pub struct ProxyQuery {
    pub url: String,
}

async fn handle_proxy(
    Query(query): Query<ProxyQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    if !is_safe_url(&query.url).await {
        return Err((
            StatusCode::BAD_REQUEST,
            "Proxy URL is unsafe or resolves to a private/loopback address".to_string(),
        ));
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap_or_default();

    let mut req = client.get(&query.url);
    if query.url.contains("surrit.com") || query.url.contains("missav") {
        req = req.header(reqwest::header::REFERER, "https://missav.ws/");
    } else if query.url.contains("instagram") || query.url.contains("cdninstagram") {
        req = req.header(reqwest::header::REFERER, "https://www.instagram.com/");
    } else if query.url.contains("facebook") || query.url.contains("fbcdn") || query.url.contains("fb.watch") {
        req = req.header(reqwest::header::REFERER, "https://www.facebook.com/");
    } else if query.url.contains("twitter") || query.url.contains("x.com") {
        req = req.header(reqwest::header::REFERER, "https://x.com/");
    } else if query.url.contains("googlevideo.com") || query.url.contains("youtube") {
        req = req.header(reqwest::header::REFERER, "https://www.youtube.com/");
    } else if let Ok(parsed) = reqwest::Url::parse(&query.url) {
        if let Some(host) = parsed.host_str() {
            req = req.header(reqwest::header::REFERER, format!("{}://{}/", parsed.scheme(), host));
        }
    }

    let resp = req.send().await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Proxy request failed: {}", e)))?;

    let status = resp.status();
    let content_type = resp.headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|h| h.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    let content_type_lc = content_type.to_lowercase();
    if content_type_lc.contains("text/html") || content_type_lc.contains("application/xhtml+xml") {
        return Err((
            StatusCode::BAD_REQUEST,
            "Proxying HTML content is forbidden to prevent XSS".to_string(),
        ));
    }

    let body_bytes = resp.bytes().await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Failed to read proxy response: {}", e)))?;

    // Rewrite m3u8 playlist segment URLs to proxy path
    let mut response_bytes = body_bytes.to_vec();
    if content_type.contains("mpegurl") || content_type.contains("m3u8") || query.url.contains(".m3u8") {
        if let Ok(body_str) = std::str::from_utf8(&body_bytes) {
            let mut rewritten = String::new();
            let base_url = query.url.clone();
            
            for line in body_str.lines() {
                let trimmed = line.trim();
                if !trimmed.is_empty() && !trimmed.starts_with('#') {
                    let absolute_url = if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
                        trimmed.to_string()
                    } else if let Ok(base) = reqwest::Url::parse(&base_url) {
                        if let Ok(joined) = base.join(trimmed) {
                            joined.to_string()
                        } else {
                            trimmed.to_string()
                        }
                    } else {
                        trimmed.to_string()
                    };
                    
                    let proxy_segment_url = format!("/api/proxy?url={}", urlencoding::encode(&absolute_url));
                    rewritten.push_str(&proxy_segment_url);
                    rewritten.push_str("\n");
                } else {
                    rewritten.push_str(line);
                    rewritten.push_str("\n");
                }
            }
            response_bytes = rewritten.into_bytes();
        }
    }

    let mut headers = HeaderMap::new();
    if let Ok(val) = HeaderValue::from_str(&content_type) {
        headers.insert(axum::http::header::CONTENT_TYPE, val);
    }
    headers.insert(axum::http::header::ACCESS_CONTROL_ALLOW_ORIGIN, HeaderValue::from_static("*"));
    headers.insert(axum::http::header::X_CONTENT_TYPE_OPTIONS, HeaderValue::from_static("nosniff"));

    let response_status = axum::http::StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::OK);
    Ok((response_status, headers, response_bytes))
}

fn spawn_cleanup_task() {
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

pub async fn run_server(port: u16) -> Result<(), Box<dyn std::error::Error>> {
    // Ensure downloads directory exists
    let _ = std::fs::create_dir_all("./downloads");

    // Start background cleanup task for expired downloads
    spawn_cleanup_task();

    use tower_http::services::ServeDir;

    let app = Router::new()
        .route("/api/extract", post(handle_extract))
        .route("/api/download", get(handle_download))
        .route("/api/proxy", get(handle_proxy))
        .nest_service("/downloads", ServeDir::new("./downloads"))
        .fallback_service(ServeDir::new("frontend/dist"))
        .layer(CorsLayer::permissive());

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    println!("Server running on http://{}", addr);
    axum::serve(listener, app).await?;
    Ok(())
}
