use axum::{
    extract::FromRequestParts,
    http::request::Parts,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::{Mutex, OnceLock};
use totp_rs::{Algorithm, Secret, TOTP};
use rand::Rng;
use crate::server::config::{load_config, save_config};

// Active sessions storage
static ACTIVE_SESSIONS: OnceLock<Mutex<HashSet<String>>> = OnceLock::new();

pub fn get_active_sessions() -> &'static Mutex<HashSet<String>> {
    ACTIVE_SESSIONS.get_or_init(|| Mutex::new(HashSet::new()))
}

pub fn is_token_valid(token: &str) -> bool {
    get_active_sessions().lock().unwrap().contains(token)
}

pub fn generate_session_token() -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..32).map(|_| rng.gen::<u8>()).collect();
    let token: String = bytes.iter().map(|b| format!("{:02x}", b)).collect();
    get_active_sessions().lock().unwrap().insert(token.clone());
    token
}

pub fn invalidate_token(token: &str) {
    get_active_sessions().lock().unwrap().remove(token);
}

// Axum Extractor for admin authentication
pub struct AdminSession {
    pub token: String,
}

#[axum::async_trait]
impl<S> FromRequestParts<S> for AdminSession
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<serde_json::Value>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        if let Some(auth_header) = parts.headers.get("authorization") {
            if let Ok(auth_str) = auth_header.to_str() {
                if auth_str.starts_with("Bearer ") {
                    let token = auth_str.trim_start_matches("Bearer ").to_string();
                    if is_token_valid(&token) {
                        return Ok(AdminSession { token });
                    }
                }
            }
        }
        
        Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "status": "error",
                "message": "Unauthorized: Invalid or missing session token"
            })),
        ))
    }
}

// Request and Response Structs
#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: Option<String>,
    pub password: Option<String>,
    pub code: Option<String>,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub status: String,
    pub token: Option<String>,
    pub message: Option<String>,
}

#[derive(Serialize)]
pub struct Setup2faResponse {
    pub secret: String,
    pub qr_uri: String,
}

#[derive(Deserialize)]
pub struct Enable2faRequest {
    pub secret: String,
    pub code: String,
}

#[derive(Deserialize)]
pub struct Disable2faRequest {
    pub password: String,
    pub code: String,
}

// Helper to construct TOTP instance
fn get_totp_instance(username: &str, secret_b32: &str) -> Result<TOTP, String> {
    let secret = Secret::Encoded(secret_b32.to_string())
        .to_bytes()
        .map_err(|e| format!("Invalid base32 secret: {}", e))?;

    TOTP::new(
        Algorithm::SHA1,
        6,
        1,
        30,
        secret,
        Some("Vidlord".to_string()),
        username.to_string(),
    )
    .map_err(|e| format!("Failed to create TOTP instance: {}", e))
}

// Helper to generate standard base32 key
pub fn generate_base32_secret() -> String {
    let mut rng = rand::thread_rng();
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    (0..32)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect()
}

// Handlers
pub async fn handle_admin_login(
    Json(payload): Json<LoginRequest>,
) -> impl IntoResponse {
    let config = load_config();
    
    let username = payload.username.unwrap_or_default();
    let password = payload.password.unwrap_or_default();
    
    // Check credentials
    if username != config.admin_username {
        return (
            StatusCode::UNAUTHORIZED,
            Json(LoginResponse {
                status: "error".to_string(),
                token: None,
                message: Some("Incorrect username or password".to_string()),
            }),
        );
    }
    
    // Check bcrypt password hash
    let password_ok = bcrypt::verify(&password, &config.vault_password_hash).unwrap_or(false);
    if !password_ok {
        return (
            StatusCode::UNAUTHORIZED,
            Json(LoginResponse {
                status: "error".to_string(),
                token: None,
                message: Some("Incorrect username or password".to_string()),
            }),
        );
    }
    
    // Check 2FA
    if config.totp_enabled {
        if let Some(secret) = config.totp_secret.as_ref() {
            match payload.code {
                Some(code) => {
                    // Verify the TOTP code
                    if let Ok(totp) = get_totp_instance(&username, secret) {
                        let now = std::time::SystemTime::now()
                            .duration_since(std::time::SystemTime::UNIX_EPOCH)
                            .unwrap()
                            .as_secs();
                        if totp.check(&code, now) {
                            let token = generate_session_token();
                            return (
                                StatusCode::OK,
                                Json(LoginResponse {
                                    status: "success".to_string(),
                                    token: Some(token),
                                    message: None,
                                }),
                            );
                        }
                    }
                    return (
                        StatusCode::UNAUTHORIZED,
                        Json(LoginResponse {
                            status: "error".to_string(),
                            token: None,
                            message: Some("Invalid 2FA verification code".to_string()),
                        }),
                    );
                }
                None => {
                    // Code required
                    return (
                        StatusCode::OK,
                        Json(LoginResponse {
                            status: "require_2fa".to_string(),
                            token: None,
                            message: Some("Two-factor authentication code required".to_string()),
                        }),
                    );
                }
            }
        }
    }
    
    // Success (no 2FA)
    let token = generate_session_token();
    (
        StatusCode::OK,
        Json(LoginResponse {
            status: "success".to_string(),
            token: Some(token),
            message: None,
        }),
    )
}

pub async fn handle_admin_logout(
    session: AdminSession,
) -> impl IntoResponse {
    invalidate_token(&session.token);
    StatusCode::OK
}

pub async fn handle_2fa_setup(
    _session: AdminSession,
) -> impl IntoResponse {
    let config = load_config();
    let secret = generate_base32_secret();
    
    if let Ok(totp) = get_totp_instance(&config.admin_username, &secret) {
        let qr_uri = totp.get_url();
        (
            StatusCode::OK,
            Json(Some(Setup2faResponse {
                secret,
                qr_uri,
            })),
        )
    } else {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(None),
        )
    }
}

pub async fn handle_2fa_enable(
    _session: AdminSession,
    Json(payload): Json<Enable2faRequest>,
) -> impl IntoResponse {
    let mut config = load_config();
    
    if let Ok(totp) = get_totp_instance(&config.admin_username, &payload.secret) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        if totp.check(&payload.code, now) {
            config.totp_secret = Some(payload.secret);
            config.totp_enabled = true;
            if save_config(&config).is_ok() {
                return (
                    StatusCode::OK,
                    Json(serde_json::json!({
                        "status": "success",
                        "message": "2FA successfully enabled!"
                    })),
                );
            }
        }
    }
    
    (
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({
            "status": "error",
            "message": "Invalid verification code. Please try again."
        })),
    )
}

pub async fn handle_2fa_disable(
    _session: AdminSession,
    Json(payload): Json<Disable2faRequest>,
) -> impl IntoResponse {
    let mut config = load_config();
    
    // Verify password
    let password_ok = bcrypt::verify(&payload.password, &config.vault_password_hash).unwrap_or(false);
    if !password_ok {
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({
                "status": "error",
                "message": "Incorrect password"
            })),
        );
    }
    
    // Verify 2FA code
    if let Some(secret) = config.totp_secret.as_ref() {
        if let Ok(totp) = get_totp_instance(&config.admin_username, secret) {
            let now = std::time::SystemTime::now()
                .duration_since(std::time::SystemTime::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            if totp.check(&payload.code, now) {
                config.totp_enabled = false;
                config.totp_secret = None;
                if save_config(&config).is_ok() {
                    return (
                        StatusCode::OK,
                        Json(serde_json::json!({
                            "status": "success",
                            "message": "2FA successfully disabled"
                        })),
                    );
                }
            }
        }
    }
    
    (
        StatusCode::BAD_REQUEST,
        Json(serde_json::json!({
            "status": "error",
            "message": "Invalid 2FA verification code"
        })),
    )
}
