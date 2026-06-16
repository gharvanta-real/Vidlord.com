use serde::{Deserialize, Serialize};
use std::sync::{Mutex, OnceLock};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Sponsor {
    pub id: String,
    pub title: String,
    pub url: String,
    pub logo: String,
    pub clicks: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct AdminConfig {
    pub user_agent: String,
    pub popunder_enabled: bool,
    pub popunder_script: String,
    pub banner_enabled: bool,
    pub banner_script: String,
    pub header_script: String,
    pub sponsors: Vec<Sponsor>,
    pub ip_whitelist: String,
    
    // Secure configuration fields
    pub admin_username: String,
    pub vault_password_hash: String,
    pub totp_enabled: bool,
    pub totp_secret: Option<String>,
}

#[derive(Deserialize)]
struct RawAdminConfig {
    user_agent: String,
    popunder_enabled: bool,
    popunder_script: String,
    banner_enabled: bool,
    banner_script: String,
    header_script: String,
    sponsors: Vec<Sponsor>,
    ip_whitelist: String,
    
    // Deprecated plaintext field for migration
    vault_password: Option<String>,
    
    // Secure fields
    admin_username: Option<String>,
    vault_password_hash: Option<String>,
    totp_enabled: Option<bool>,
    totp_secret: Option<String>,
}

static CONFIG_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

fn get_config_mutex() -> &'static Mutex<()> {
    CONFIG_LOCK.get_or_init(|| Mutex::new(()))
}

pub fn load_config() -> AdminConfig {
    let _lock = get_config_mutex().lock().unwrap();
    let path = "./admin_config.json";
    
    if let Ok(file_content) = std::fs::read_to_string(path) {
        if let Ok(raw) = serde_json::from_str::<RawAdminConfig>(&file_content) {
            let mut need_save = false;
            
            let admin_username = match raw.admin_username {
                Some(u) => u,
                None => {
                    need_save = true;
                    "admin".to_string()
                }
            };
            
            let vault_password_hash = match raw.vault_password_hash {
                Some(h) => h,
                None => {
                    need_save = true;
                    // If we have an old plaintext password, hash it, otherwise hash the default "admin"
                    let plaintext = raw.vault_password.as_deref().unwrap_or("admin");
                    bcrypt::hash(plaintext, bcrypt::DEFAULT_COST).unwrap_or_default()
                }
            };
            
            let totp_enabled = match raw.totp_enabled {
                Some(b) => b,
                None => {
                    need_save = true;
                    false
                }
            };
            
            let totp_secret = raw.totp_secret;
            
            // If the old plaintext vault_password field is still present in the loaded JSON,
            // we should save to rewrite the file without it.
            if raw.vault_password.is_some() {
                need_save = true;
            }
            
            let config = AdminConfig {
                user_agent: raw.user_agent,
                popunder_enabled: raw.popunder_enabled,
                popunder_script: raw.popunder_script,
                banner_enabled: raw.banner_enabled,
                banner_script: raw.banner_script,
                header_script: raw.header_script,
                sponsors: raw.sponsors,
                ip_whitelist: raw.ip_whitelist,
                admin_username,
                vault_password_hash,
                totp_enabled,
                totp_secret,
            };
            
            if need_save {
                // Save immediately to migrate file format
                let _ = save_config_internal(&config);
            }
            
            return config;
        }
    }
    
    // Default config if file does not exist or deserialization fails
    let default_config = AdminConfig {
        user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36".to_string(),
        popunder_enabled: false,
        popunder_script: "".to_string(),
        banner_enabled: true,
        banner_script: "".to_string(),
        header_script: "".to_string(),
        sponsors: vec![
            Sponsor { id: "1".to_string(), title: "ProtonMail Secure".to_string(), url: "https://proton.me".to_string(), logo: "/protonmail_banner.png".to_string(), clicks: 142 },
            Sponsor { id: "2".to_string(), title: "NordVPN Deal".to_string(), url: "https://nordvpn.com".to_string(), logo: "/nordvpn_banner.png".to_string(), clicks: 89 },
            Sponsor { id: "3".to_string(), title: "Felbic App Store".to_string(), url: "https://felbic.com".to_string(), logo: "/felbic_banner.png".to_string(), clicks: 231 },
        ],
        ip_whitelist: "127.0.0.1, 3.109.44.87".to_string(),
        admin_username: "admin".to_string(),
        vault_password_hash: bcrypt::hash("admin", bcrypt::DEFAULT_COST).unwrap_or_default(),
        totp_enabled: false,
        totp_secret: None,
    };
    
    let _ = save_config_internal(&default_config);
    default_config
}

pub fn save_config(config: &AdminConfig) -> Result<(), Box<dyn std::error::Error>> {
    let _lock = get_config_mutex().lock().unwrap();
    save_config_internal(config)
}

fn save_config_internal(config: &AdminConfig) -> Result<(), Box<dyn std::error::Error>> {
    let path = "./admin_config.json";
    let json_str = serde_json::to_string_pretty(config)?;
    std::fs::write(path, json_str)?;
    Ok(())
}

pub fn get_configured_user_agent() -> String {
    load_config().user_agent
}
