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

async fn handle_extract(
    Json(payload): Json<ExtractRequest>,
) -> Result<Json<crate::extractor::ExtractionResult>, (axum::http::StatusCode, String)> {
    match extract_video_details(&payload.url).await {
        Ok(result) => Ok(Json(result)),
        Err(e) => Err((
            axum::http::StatusCode::INTERNAL_SERVER_ERROR,
            format!("Extraction failed: {}", e),
        )),
    }
}

async fn handle_download(
    Query(query): Query<DownloadQuery>,
) -> Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>> {
    let (tx, rx) = mpsc::channel(100);

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
        match download_stream(&query.url, audio_url_ref, &query.output_path, progress_cb).await {
            Ok(()) => {
                let _ = tx.send(ProgressMessage::Completed).await;
            }
            Err(e) => {
                let _ = tx.send(ProgressMessage::Error { message: e.to_string() }).await;
            }
        }
    });

    let stream = ReceiverStream::new(rx).map(|msg| {
        let json_str = serde_json::to_string(&msg).unwrap_or_default();
        Ok(Event::default().data(json_str))
    });

    Sse::new(stream).keep_alive(KeepAlive::default())
}

#[derive(Deserialize)]
pub struct ProxyQuery {
    pub url: String,
}

async fn handle_proxy(
    Query(query): Query<ProxyQuery>,
) -> Result<impl IntoResponse, (StatusCode, String)> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .danger_accept_invalid_certs(true)
        .build()
        .unwrap_or_default();

    let mut req = client.get(&query.url);
    if query.url.contains("surrit.com") || query.url.contains("missav") {
        req = req.header(reqwest::header::REFERER, "https://missav.ws/");
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
