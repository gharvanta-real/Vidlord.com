use std::io::{stdout, Write};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use std::path::{Path, PathBuf};
use crossterm::{
    cursor,
    event::{self, Event, KeyCode, KeyModifiers},
    execute,
    terminal,
};
use crate::extractor::{extract_video_details, ExtractionResult, VideoFormat, VideoInfo};
use crate::downloader::download_stream;

struct RawModeGuard;

impl RawModeGuard {
    fn new() -> Result<Self, std::io::Error> {
        terminal::enable_raw_mode()?;
        execute!(stdout(), cursor::Hide)?;
        Ok(RawModeGuard)
    }
}

impl Drop for RawModeGuard {
    fn drop(&mut self) {
        let _ = terminal::disable_raw_mode();
        let _ = execute!(stdout(), cursor::Show);
    }
}

#[derive(Clone)]
enum AppState {
    InputUrl {
        input: String,
        status: String,
    },
    Extracting {
        url: String,
    },
    SelectingFormat {
        info: VideoInfo,
        formats: Vec<VideoFormat>,
        selection: String,
        status: String,
    },
    Downloading {
        info: VideoInfo,
        format: VideoFormat,
        output_path: String,
    },
}

struct TuiSharedState {
    extraction_result: Option<Result<ExtractionResult, String>>,
    download_progress: Option<(f64, f64)>,
    download_finished: bool,
    download_status: String,
    download_start_time: Option<std::time::Instant>,
}

fn get_downloads_dir() -> PathBuf {
    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    let path = Path::new(&home).join("Downloads");
    if path.exists() && path.is_dir() {
        path
    } else {
        PathBuf::from(".")
    }
}

fn sanitize_filename(title: &str) -> String {
    let mut sanitized: String = title
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect();
    sanitized = sanitized.trim_matches(|c| c == ' ' || c == '.').to_string();
    if sanitized.is_empty() {
        "video".to_string()
    } else {
        sanitized
    }
}

fn draw_ui(state: &AppState, shared: &TuiSharedState) -> Result<(), std::io::Error> {
    let mut out = stdout();
    
    // Clear and reset cursor
    execute!(
        out,
        terminal::Clear(terminal::ClearType::All),
        cursor::MoveTo(0, 0)
    )?;

    // 1. Draw Arch Logo using ANSI escape sequences
    println!("      \x1b[38;5;208m▄\x1b[38;5;202m█\x1b[38;5;208m▄\x1b[0m");
    println!("     \x1b[38;5;202m▄█\x1b[38;5;190m▀\x1b[38;5;202m█▄\x1b[0m       \x1b[1;36mVidlord CLI 1.0.0\x1b[0m");
    println!("    \x1b[38;5;190m▄█▀\x1b[38;5;46m ▀\x1b[38;5;190m█▄\x1b[0m      Async Stream Downloader");
    println!("   \x1b[38;5;46m▄█▀\x1b[38;5;39m   ▀\x1b[38;5;46m█▄\x1b[0m     ~");
    println!("  \x1b[38;5;39m▄█▀\x1b[38;5;21m     ▀\x1b[38;5;39m█▄\x1b[0m");

    // 2. Separator Line
    println!("\x1b[90m────────────────────────────────────────────────────────────────────────────────\x1b[0m");

    // Draw main body based on current state
    let cursor_pos = match state {
        AppState::InputUrl { input, status } => {
            println!();
            print!("  \x1b[1;37mEnter URL:\x1b[0m {}", input);
            println!("\n");
            println!("\x1b[90m────────────────────────────────────────────────────────────────────────────────\x1b[0m");
            if status.starts_with("Error") {
                println!("  \x1b[31;1m{}\x1b[0m", status);
            } else if status.starts_with("Success") {
                println!("  \x1b[32;1m{}\x1b[0m", status);
            } else {
                println!("  \x1b[33m{}\x1b[0m", status);
            }
            // Place cursor at the end of input
            cursor::MoveTo(13 + input.len() as u16, 7)
        }
        AppState::Extracting { url } => {
            println!();
            println!("  \x1b[1;37mURL:\x1b[0m \x1b[90m{}\x1b[0m", url);
            println!();
            println!("  \x1b[33mExtracting video details from Invidious api...\x1b[0m");
            println!();
            println!("\x1b[90m────────────────────────────────────────────────────────────────────────────────\x1b[0m");
            println!("  Please wait...");
            // Keep cursor hidden/ignored
            cursor::MoveTo(0, 7)
        }
        AppState::SelectingFormat { info, formats, selection, status } => {
            println!("  \x1b[1;36mTitle:\x1b[0m \x1b[1;37m{}\x1b[0m", info.title);
            println!("  Select download format (Enter option number):");
            
            for (idx, f) in formats.iter().enumerate() {
                let size_str = if f.size_mb > 0.0 {
                    format!("{:.1} MB", f.size_mb)
                } else {
                    "Unknown size".to_string()
                };
                let type_label = if f.is_audio {
                    "\x1b[35m[Audio]\x1b[0m"
                } else {
                    "\x1b[32m[Video]\x1b[0m"
                };
                println!("    \x1b[1;33m[{}]\x1b[0m {} {} - \x1b[90m{}\x1b[0m", idx + 1, type_label, f.quality, size_str);
            }
            
            println!("\x1b[90m────────────────────────────────────────────────────────────────────────────────\x1b[0m");
            print!("  \x1b[1;37mSelect option (1-{}):\x1b[0m {}", formats.len(), selection);
            println!("\n");
            println!("\x1b[90m────────────────────────────────────────────────────────────────────────────────\x1b[0m");
            if status.starts_with("Error") {
                println!("  \x1b[31;1m{}\x1b[0m", status);
            } else {
                println!("  \x1b[33m{}\x1b[0m", status);
            }
            // Cursor position for option selection
            cursor::MoveTo(23 + selection.len() as u16, 8 + formats.len() as u16)
        }
        AppState::Downloading { info, format, output_path } => {
            println!("  \x1b[1;36mTitle:\x1b[0m \x1b[90m{}\x1b[0m", info.title);
            println!("  \x1b[1;36mFormat:\x1b[0m \x1b[32m{}\x1b[0m", format.quality);
            println!("  \x1b[1;36mSaving to:\x1b[0m \x1b[90m{}\x1b[0m", output_path);
            println!();

            if let Some((current, total)) = shared.download_progress {
                let pct = if total > 0.0 { (current / total) * 100.0 } else { 0.0 };
                let filled_width = ((pct / 5.0).round() as usize).min(20);
                let empty_width = 20 - filled_width;
                let bar = format!(
                    "\x1b[32m{}\x1b[90m{}\x1b[0m",
                    "█".repeat(filled_width),
                    "░".repeat(empty_width)
                );

                let mut speed_str = String::new();
                let mut eta_str = String::new();
                if let Some(start_time) = shared.download_start_time {
                    let elapsed = start_time.elapsed().as_secs_f64();
                    if elapsed > 0.1 && current > 0.0 {
                        let speed_bps = current / elapsed;
                        let speed_mbps = (speed_bps * 8.0) / (1024.0 * 1024.0);
                        let speed_mbs = speed_bps / (1024.0 * 1024.0);
                        
                        if speed_mbs >= 1.0 {
                            speed_str = format!(" | Speed: {:.2} MB/s ({:.1} Mbps)", speed_mbs, speed_mbps);
                        } else {
                            speed_str = format!(" | Speed: {:.1} KB/s ({:.1} Mbps)", speed_bps / 1024.0, speed_mbps);
                        }
                        
                        if total > current {
                            let remaining_bytes = total - current;
                            let eta_secs = remaining_bytes / speed_bps;
                            if eta_secs < 60.0 {
                                eta_str = format!(" | ETA: {:.0}s", eta_secs);
                            } else {
                                let eta_mins = (eta_secs / 60.0).floor();
                                let eta_secs_rem = (eta_secs % 60.0).round();
                                eta_str = format!(" | ETA: {:.0}m {:.0}s", eta_mins, eta_secs_rem);
                            }
                        }
                    }
                }

                print!(
                    "  Progress: [{}] {:.1}% ({:.2} MB / {:.2} MB){}{}",
                    bar,
                    pct,
                    current / (1024.0 * 1024.0),
                    total / (1024.0 * 1024.0),
                    speed_str,
                    eta_str
                );
            } else {
                print!("  Initializing download stream...");
            }
            println!("\n");
            println!("\x1b[90m────────────────────────────────────────────────────────────────────────────────\x1b[0m");
            println!("  \x1b[33m{}\x1b[0m", shared.download_status);
            cursor::MoveTo(0, 10)
        }
    };

    println!();
    
    // 7. Footer
    let downloads_dir = get_downloads_dir();
    print!(
        "  \x1b[90mEsc/Ctrl+C to quit | Target: {}\x1b[0m",
        downloads_dir.to_string_lossy()
    );

    // Apply cursor position
    execute!(out, cursor_pos, cursor::Show)?;
    out.flush()?;
    Ok(())
}

pub async fn run_tui() -> Result<(), Box<dyn std::error::Error>> {
    let _guard = RawModeGuard::new()?;

    let mut state = AppState::InputUrl {
        input: String::new(),
        status: "Paste link and press Enter to download".to_string(),
    };

    let shared_state = Arc::new(Mutex::new(TuiSharedState {
        extraction_result: None,
        download_progress: None,
        download_finished: false,
        download_status: String::new(),
        download_start_time: None,
    }));

    // Initial draw
    draw_ui(&state, &shared_state.lock().unwrap())?;

    loop {
        // Redraw loop
        let current_state = state.clone();

        match current_state {
            AppState::InputUrl { .. } => {
                // Just wait for input
            }
            AppState::Extracting { .. } => {
                // Check if background extraction finished
                let ext_res = {
                    let mut s = shared_state.lock().unwrap();
                    s.extraction_result.take()
                };

                if let Some(res) = ext_res {
                    match res {
                        Ok(data) => {
                            state = AppState::SelectingFormat {
                                info: data.info,
                                formats: data.formats,
                                selection: String::new(),
                                status: "Type the option number and press Enter".to_string(),
                            };
                        }
                        Err(err) => {
                            state = AppState::InputUrl {
                                input: String::new(),
                                status: format!("Error: Extraction failed: {}", err),
                            };
                        }
                    }
                    draw_ui(&state, &shared_state.lock().unwrap())?;
                }
            }
            AppState::SelectingFormat { .. } => {
                // Wait for input selection
            }
            AppState::Downloading { .. } => {
                // Check if download finished
                let (finished, _progress, status_msg) = {
                    let s = shared_state.lock().unwrap();
                    (s.download_finished, s.download_progress, s.download_status.clone())
                };

                if finished {
                    state = AppState::InputUrl {
                        input: String::new(),
                        status: status_msg,
                    };
                    {
                        // Reset download state
                        let mut s = shared_state.lock().unwrap();
                        s.download_finished = false;
                        s.download_progress = None;
                        s.download_start_time = None;
                    }
                }
                draw_ui(&state, &shared_state.lock().unwrap())?;
            }
        }

        // Poll for terminal events (keypresses)
        if event::poll(Duration::from_millis(50))? {
            if let Event::Key(key) = event::read()? {
                // Handle Ctrl+C or Esc to quit
                if key.code == KeyCode::Esc || (key.code == KeyCode::Char('c') && key.modifiers.contains(KeyModifiers::CONTROL)) {
                    break;
                }

                // If Extracting, ignore keyboard inputs
                if let AppState::Extracting { .. } = state {
                    continue;
                }

                match &mut state {
                    AppState::InputUrl { input, status: _ } => {
                        match key.code {
                            KeyCode::Char(c) => {
                                // Ignore Windows key release events
                                if key.kind != event::KeyEventKind::Release {
                                    input.push(c);
                                    draw_ui(&state, &shared_state.lock().unwrap())?;
                                }
                            }
                            KeyCode::Backspace => {
                                if key.kind != event::KeyEventKind::Release {
                                    input.pop();
                                    draw_ui(&state, &shared_state.lock().unwrap())?;
                                }
                            }
                            KeyCode::Enter => {
                                if key.kind != event::KeyEventKind::Release && !input.trim().is_empty() {
                                    let url = input.trim().to_string();
                                    state = AppState::Extracting { url: url.clone() };
                                    
                                    // Reset shared state extraction
                                    {
                                        let mut s = shared_state.lock().unwrap();
                                        s.extraction_result = None;
                                    }

                                    let state_clone = Arc::clone(&shared_state);
                                    tokio::spawn(async move {
                                        let res = extract_video_details(&url).await;
                                        let mut s = state_clone.lock().unwrap();
                                        s.extraction_result = Some(res.map_err(|e| e.to_string()));
                                    });
                                    
                                    draw_ui(&state, &shared_state.lock().unwrap())?;
                                }
                            }
                            _ => {}
                        }
                    }
                    AppState::SelectingFormat { info, formats, selection, status } => {
                        match key.code {
                            KeyCode::Char(c) => {
                                if key.kind != event::KeyEventKind::Release {
                                    selection.push(c);
                                    draw_ui(&state, &shared_state.lock().unwrap())?;
                                }
                            }
                            KeyCode::Backspace => {
                                if key.kind != event::KeyEventKind::Release {
                                    selection.pop();
                                    draw_ui(&state, &shared_state.lock().unwrap())?;
                                }
                            }
                            KeyCode::Enter => {
                                if key.kind != event::KeyEventKind::Release {
                                    let idx_res = selection.trim().parse::<usize>();
                                    match idx_res {
                                        Ok(idx) if idx >= 1 && idx <= formats.len() => {
                                            let format = formats[idx - 1].clone();
                                            let downloads_dir = get_downloads_dir();
                                            let sanitized = sanitize_filename(&info.title);
                                            let ext = if format.is_audio { "m4a" } else { "mp4" };
                                            let output_path = downloads_dir.join(format!("{}.{}", sanitized, ext));
                                            let output_str = output_path.to_string_lossy().to_string();
                                            let audio_url = format.audio_download_url.clone();

                                            state = AppState::Downloading {
                                                info: info.clone(),
                                                format: format.clone(),
                                                output_path: output_path.file_name().unwrap().to_string_lossy().to_string(),
                                            };

                                            // Trigger download background task
                                            {
                                                let mut s = shared_state.lock().unwrap();
                                                s.download_progress = Some((0.0, 100.0));
                                                s.download_status = format!("Starting download...");
                                                s.download_finished = false;
                                                s.download_start_time = Some(std::time::Instant::now());
                                            }

                                            let state_clone = Arc::clone(&shared_state);
                                            tokio::spawn(async move {
                                                let state_cb = Arc::clone(&state_clone);
                                                let progress_cb = move |progress| {
                                                    let mut s = state_cb.lock().unwrap();
                                                    match progress {
                                                        crate::downloader::DownloadProgress::Video { current, total } => {
                                                            s.download_progress = Some((current, total));
                                                            s.download_status = "Downloading video stream...".to_string();
                                                        }
                                                        crate::downloader::DownloadProgress::Audio { current, total } => {
                                                            s.download_progress = Some((current, total));
                                                            s.download_status = "Downloading audio stream...".to_string();
                                                        }
                                                        crate::downloader::DownloadProgress::Muxing => {
                                                            s.download_progress = None;
                                                            s.download_status = "Muxing video and audio natively (lossless)...".to_string();
                                                        }
                                                    }
                                                };

                                                let audio_url_ref = audio_url.as_deref();
                                                match download_stream(&format.download_url, audio_url_ref, &output_str, progress_cb).await {
                                                    Ok(()) => {
                                                        let mut s = state_clone.lock().unwrap();
                                                        s.download_status = format!(
                                                            "Success! Saved to target folder: {}.{}",
                                                            sanitized, ext
                                                        );
                                                        s.download_finished = true;
                                                    }
                                                    Err(e) => {
                                                        let mut s = state_clone.lock().unwrap();
                                                        s.download_status = format!("Error: Download failed: {}", e);
                                                        s.download_finished = true;
                                                    }
                                                }
                                            });

                                            draw_ui(&state, &shared_state.lock().unwrap())?;
                                        }
                                        _ => {
                                            *status = format!("Error: Invalid option. Select 1 to {}", formats.len());
                                            selection.clear();
                                            draw_ui(&state, &shared_state.lock().unwrap())?;
                                        }
                                    }
                                }
                            }
                            _ => {}
                        }
                    }
                    _ => {}
                }
            }
        }
    }

    Ok(())
}
