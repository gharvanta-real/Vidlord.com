use clap::{Parser, Subcommand};
use std::io::Write;
use vidlord_scraper::{extract_video_details, download_stream, run_server};

#[derive(Parser)]
#[command(name = "vidlord-scraper")]
#[command(about = "Industry-grade video metadata extractor and downloader", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Starts the local HTTP REST and SSE server
    Server {
        /// Port to bind the server to
        #[arg(short, long, default_value_t = 8080)]
        port: u16,
    },
    /// Extracts video details (metadata & stream formats) from a URL
    Extract {
        /// Video URL (e.g. YouTube, direct video page)
        url: String,
    },
    /// Downloads video stream from a URL to local disk
    Download {
        /// Stream URL to download (obtained from extract)
        url: String,
        /// Target output file path
        output_path: String,
        /// Optional audio URL to merge with the video
        #[arg(long)]
        audio_url: Option<String>,
    },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let cli = Cli::parse();

    match cli.command {
        None => {
            vidlord_scraper::run_tui().await?;
        }
        Some(Commands::Server { port }) => {
            println!("Starting local REST server on port {}...", port);
            run_server(port).await?;
        }
        Some(Commands::Extract { url }) => {
            println!("Extracting metadata for: {}", url);
            match extract_video_details(&url).await {
                Ok(result) => {
                    let json = serde_json::to_string_pretty(&result)?;
                    println!("{}", json);
                }
                Err(e) => {
                    eprintln!("Error: {}", e);
                    std::process::exit(1);
                }
            }
        }
        Some(Commands::Download { url, output_path, audio_url }) => {
            println!("Downloading stream...");
            println!("From: {}", url);
            if let Some(ref a_url) = audio_url {
                println!("Audio From: {}", a_url);
            }
            println!("To:   {}", output_path);

            let progress_cb = |progress| {
                match progress {
                    vidlord_scraper::downloader::DownloadProgress::Video { current, total } => {
                        if total > 0.0 {
                            let percentage = (current / total) * 100.0;
                            print!(
                                "\r[Video] Progress: {:.1}% ({:.2} MB / {:.2} MB)",
                                percentage,
                                current / (1024.0 * 1024.0),
                                total / (1024.0 * 1024.0)
                            );
                        } else {
                            print!("\r[Video] Downloaded: {:.2} MB", current / (1024.0 * 1024.0));
                        }
                    }
                    vidlord_scraper::downloader::DownloadProgress::Audio { current, total } => {
                        if total > 0.0 {
                            let percentage = (current / total) * 100.0;
                            print!(
                                "\r[Audio] Progress: {:.1}% ({:.2} MB / {:.2} MB)",
                                percentage,
                                current / (1024.0 * 1024.0),
                                total / (1024.0 * 1024.0)
                            );
                        } else {
                            print!("\r[Audio] Downloaded: {:.2} MB", current / (1024.0 * 1024.0));
                        }
                    }
                    vidlord_scraper::downloader::DownloadProgress::Muxing => {
                        println!("\nMuxing video and audio tracks natively (lossless)...");
                    }
                }
                let _ = std::io::stdout().flush();
            };

            let audio_url_ref = audio_url.as_deref();
            match download_stream(&url, audio_url_ref, &output_path, progress_cb).await {
                Ok(()) => {
                    println!("\nDownload completed successfully!");
                }
                Err(e) => {
                    eprintln!("\nDownload failed: {}", e);
                    std::process::exit(1);
                }
            }
        }
    }

    Ok(())
}
