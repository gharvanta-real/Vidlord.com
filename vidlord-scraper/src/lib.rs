#![allow(async_fn_in_trait)]

pub mod errors;
pub mod extractor;
pub mod downloader;
pub mod server;
pub mod tui;

pub use errors::ScraperError;
pub use extractor::{VideoInfo, VideoFormat, ExtractionResult, extract_video_details};
pub use downloader::hls::HlsDownloader;
pub use downloader::{Downloader, download_stream, muxer::merge_mp4_m4a};
pub use server::run_server;
pub use tui::run_tui;
