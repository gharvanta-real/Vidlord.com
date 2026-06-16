pub mod config;
pub mod auth;
pub mod handlers;
pub mod utils;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::CorsLayer;
use std::net::SocketAddr;

pub use config::get_configured_user_agent;

pub async fn run_server(port: u16) -> Result<(), Box<dyn std::error::Error>> {
    // Ensure downloads directory exists
    let _ = std::fs::create_dir_all("./downloads");

    // Start background cleanup task for expired downloads
    utils::spawn_cleanup_task();

    use tower_http::services::{ServeDir, ServeFile};

    let app = Router::new()
        .route("/ads_config.json", get(handlers::handle_ads_config))
        .route("/api/client/config", get(handlers::handle_client_config))
        .route("/api/extract", post(handlers::handle_extract))
        .route("/api/download", get(handlers::handle_download))
        .route("/api/download/direct", get(handlers::handle_download_direct))
        .route("/api/proxy", get(handlers::handle_proxy))
        .route("/api/ads/click", post(handlers::handle_ad_click))
        .route("/api/admin/login", post(auth::handle_admin_login))
        .route("/api/admin/logout", post(auth::handle_admin_logout))
        .route("/api/admin/change-password", post(handlers::handle_change_password))
        .route("/api/admin/2fa/setup", post(auth::handle_2fa_setup))
        .route("/api/admin/2fa/enable", post(auth::handle_2fa_enable))
        .route("/api/admin/2fa/disable", post(auth::handle_2fa_disable))
        .route("/api/admin/config", get(handlers::handle_admin_config_get).post(handlers::handle_admin_config_post))
        .route("/api/admin/cache/stats", get(handlers::handle_cache_stats))
        .route("/api/admin/cache/purge", post(handlers::handle_cache_purge))
        .route("/api/admin/logs", get(handlers::handle_admin_logs))
        .route("/api/admin/scraper/test", post(handlers::handle_scraper_test))
        .route("/api/admin/dashboard/stats", get(handlers::handle_dashboard_stats))
        .nest_service("/downloads", ServeDir::new("./downloads"))
        .fallback_service(
            ServeDir::new("frontend/dist")
                .fallback(ServeFile::new("frontend/dist/index.html"))
        )
        .layer(CorsLayer::permissive());

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    println!("Server running on http://{}", addr);
    axum::serve(listener, app).await?;
    Ok(())
}
