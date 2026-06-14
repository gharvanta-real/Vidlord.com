use thiserror::Error;

#[derive(Error, Debug)]
pub enum ScraperError {
    #[error("Invalid URL: {0}")]
    InvalidUrl(String),

    #[error("Network error occurred: {0}")]
    NetworkError(String),

    #[error("Extraction failed: {0}")]
    ExtractionError(String),

    #[error("Download failed: {0}")]
    DownloadError(String),

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("JSON parsing error: {0}")]
    JsonError(#[from] serde_json::Error),
}
