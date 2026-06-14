use std::fs::File;
use std::io::{BufReader, BufWriter};
use crate::errors::ScraperError;

/// losslessly merges an H.264 video-only MP4 file and an AAC audio-only M4A file
/// into a single, unified, standard-compliant MP4 file.
pub fn merge_mp4_m4a(video_path: &str, audio_path: &str, output_path: &str) -> Result<(), ScraperError> {
    // 1. Try to merge using ffmpeg CLI if available
    let ffmpeg_status = std::process::Command::new("ffmpeg")
        .args(&[
            "-y",
            "-i", video_path,
            "-i", audio_path,
            "-c:v", "copy",
            "-c:a", "copy",
            output_path
        ])
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status();

    match ffmpeg_status {
        Ok(status) if status.success() => {
            return Ok(());
        }
        _ => {}
    }

    // 2. Native fallback using mp4 crate
    merge_mp4_m4a_native(video_path, audio_path, output_path)
}

pub fn merge_mp4_m4a_native(video_path: &str, audio_path: &str, output_path: &str) -> Result<(), ScraperError> {
    let f_video = File::open(video_path)
        .map_err(|e| ScraperError::IoError(e))?;
    let size_video = f_video.metadata().map_err(|e| ScraperError::IoError(e))?.len();
    let mut reader_video = mp4::Mp4Reader::read_header(BufReader::new(f_video), size_video)
        .map_err(|e| ScraperError::DownloadError(format!("Failed to parse video header: {}", e)))?;

    let f_audio = File::open(audio_path)
        .map_err(|e| ScraperError::IoError(e))?;
    let size_audio = f_audio.metadata().map_err(|e| ScraperError::IoError(e))?.len();
    let mut reader_audio = mp4::Mp4Reader::read_header(BufReader::new(f_audio), size_audio)
        .map_err(|e| ScraperError::DownloadError(format!("Failed to parse audio header: {}", e)))?;

    let mut video_track_id = 0;
    let mut video_track_config = None;
    let mut video_sample_count = 0;

    for (&id, track) in reader_video.tracks() {
        if track.track_type().ok() == Some(mp4::TrackType::Video) {
            video_track_id = id;
            video_sample_count = track.sample_count();
            
            let width = track.width();
            let height = track.height();
            let seq_param_set = track.sequence_parameter_set().unwrap_or(&[]).to_vec();
            let pic_param_set = track.picture_parameter_set().unwrap_or(&[]).to_vec();

            let media_conf = mp4::MediaConfig::AvcConfig(mp4::AvcConfig {
                width,
                height,
                seq_param_set,
                pic_param_set,
            });

            video_track_config = Some(mp4::TrackConfig {
                track_type: mp4::TrackType::Video,
                timescale: track.timescale(),
                language: track.language().to_string(),
                media_conf,
            });
            break;
        }
    }

    let mut audio_track_id = 0;
    let mut audio_track_config = None;
    let mut audio_sample_count = 0;

    for (&id, track) in reader_audio.tracks() {
        if track.track_type().ok() == Some(mp4::TrackType::Audio) {
            audio_track_id = id;
            audio_sample_count = track.sample_count();

            let freq_index = track.sample_freq_index().unwrap_or(mp4::SampleFreqIndex::Freq44100);
            let chan_conf = track.channel_config().unwrap_or(mp4::ChannelConfig::Stereo);

            let media_conf = mp4::MediaConfig::AacConfig(mp4::AacConfig {
                bitrate: 128000,
                profile: mp4::AudioObjectType::AacLowComplexity,
                freq_index,
                chan_conf,
            });

            audio_track_config = Some(mp4::TrackConfig {
                track_type: mp4::TrackType::Audio,
                timescale: track.timescale(),
                language: track.language().to_string(),
                media_conf,
            });
            break;
        }
    }

    let video_config = video_track_config
        .ok_or_else(|| ScraperError::DownloadError("No video track found in video-only file".to_string()))?;
    let audio_config = audio_track_config
        .ok_or_else(|| ScraperError::DownloadError("No audio track found in audio-only file".to_string()))?;

    let f_out = File::create(output_path)
        .map_err(|e| ScraperError::IoError(e))?;
    let mp4_config = mp4::Mp4Config {
        timescale: 1000,
        major_brand: mp4::FourCC { value: *b"isom" },
        minor_version: 512,
        compatible_brands: vec![
            mp4::FourCC { value: *b"isom" },
            mp4::FourCC { value: *b"iso2" },
            mp4::FourCC { value: *b"avc1" },
            mp4::FourCC { value: *b"mp41" },
        ],
    };

    let mut writer = mp4::Mp4Writer::write_start(BufWriter::new(f_out), &mp4_config)
        .map_err(|e| ScraperError::DownloadError(format!("Failed to start MP4 writer: {}", e)))?;

    writer.add_track(&video_config)
        .map_err(|e| ScraperError::DownloadError(format!("Failed to add video track: {}", e)))?;
    let out_video_id = 1u32;

    writer.add_track(&audio_config)
        .map_err(|e| ScraperError::DownloadError(format!("Failed to add audio track: {}", e)))?;
    let out_audio_id = 2u32;

    // Copy video frames
    for sample_idx in 1..=video_sample_count {
        if let Some(sample) = reader_video.read_sample(video_track_id, sample_idx)
            .map_err(|e| ScraperError::DownloadError(format!("Failed to read video sample {}: {}", sample_idx, e)))?
        {
            writer.write_sample(out_video_id, &sample)
                .map_err(|e| ScraperError::DownloadError(format!("Failed to write video sample {}: {}", sample_idx, e)))?;
        }
    }

    // Copy audio frames
    for sample_idx in 1..=audio_sample_count {
        if let Some(sample) = reader_audio.read_sample(audio_track_id, sample_idx)
            .map_err(|e| ScraperError::DownloadError(format!("Failed to read audio sample {}: {}", sample_idx, e)))?
        {
            writer.write_sample(out_audio_id, &sample)
                .map_err(|e| ScraperError::DownloadError(format!("Failed to write audio sample {}: {}", sample_idx, e)))?;
        }
    }

    writer.write_end()
        .map_err(|e| ScraperError::DownloadError(format!("Failed to finalize MP4 file: {}", e)))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merge_missing_files() {
        let res = merge_mp4_m4a("nonexistent_video.mp4", "nonexistent_audio.m4a", "output.mp4");
        assert!(res.is_err());
        match res.unwrap_err() {
            ScraperError::IoError(_) => {}
            _ => panic!("Expected IoError"),
        }
    }
}
