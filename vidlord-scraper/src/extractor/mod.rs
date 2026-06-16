use serde::{Serialize, Deserialize};
use crate::errors::ScraperError;

pub mod youtube;
pub mod generic;
pub mod instagram;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VideoInfo {
    pub title: String,
    pub thumbnail_url: String,
    pub source_url: String,
    pub duration: String,
    pub platform: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VideoFormat {
    pub quality: String,
    pub size_mb: f64,
    pub download_url: String,
    pub is_audio: bool,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub audio_download_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ExtractionResult {
    pub info: VideoInfo,
    pub formats: Vec<VideoFormat>,
}

pub trait Extractor: Send + Sync {
    fn can_handle(&self, url: &str) -> bool;
    async fn extract(&self, url: &str) -> Result<ExtractionResult, ScraperError>;
}

/// Helper to parse and route a URL to the correct extractor.
pub async fn extract_video_details(url: &str) -> Result<ExtractionResult, ScraperError> {
    let youtube_extractor = youtube::YoutubeExtractor::new();
    let instagram_extractor = instagram::InstagramExtractor::new();
    let generic_extractor = generic::GenericExtractor::new();

    if youtube_extractor.can_handle(url) {
        youtube_extractor.extract(url).await
    } else if instagram_extractor.can_handle(url) {
        instagram_extractor.extract(url).await
    } else if generic_extractor.can_handle(url) {
        generic_extractor.extract(url).await
    } else {
        Err(ScraperError::InvalidUrl("Unsupported platform URL".to_string()))
    }
}
