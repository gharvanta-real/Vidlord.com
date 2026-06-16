/**
 * Loads the FFmpeg library from CDN dynamically.
 */
function loadFFmpegScript() {
  return new Promise((resolve, reject) => {
    if (window.FFmpegWASM) {
      resolve(window.FFmpegWASM);
      return;
    }
    const script = document.createElement("script");
    script.src = "/ffmpeg/ffmpeg.js";
    script.async = true;
    script.onload = () => {
      if (window.FFmpegWASM) {
        resolve(window.FFmpegWASM);
      } else {
        reject(new Error("FFmpegWASM object not found after script load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load FFmpeg script"));
    document.body.appendChild(script);
  });
}

/**
 * Downloads video and audio streams, then muxes them into a single MP4 inside the browser.
 */
export async function muxHlsToMp4(videoPlaylistUrl, audioPlaylistUrl, { filename = "video.mp4", onProgress } = {}) {
  try {
    // 1. Load FFmpeg script
    onProgress?.("loading_ffmpeg", 0);
    const { FFmpeg } = await loadFFmpegScript();
    const ffmpeg = new FFmpeg();

    // 2. Load FFmpeg core (using single-threaded version to avoid COOP/COEP header requirements)
    await ffmpeg.load({
      coreURL: "/ffmpeg/ffmpeg-core.js",
      wasmURL: "/ffmpeg/ffmpeg-core.wasm"
    });

    // 3. Download streams
    onProgress?.("downloading_video", 0);
    const { downloadSegments } = await import("../v1/segmentFetcher");
    
    const videoData = await downloadSegments(videoPlaylistUrl, (curr, tot, bytesDownloaded, bytesTotal) => {
      onProgress?.("downloading_video", Math.round((curr / tot) * 100), bytesDownloaded, bytesTotal);
    });

    let audioData = null;
    if (audioPlaylistUrl) {
      onProgress?.("downloading_audio", 0);
      audioData = await downloadSegments(audioPlaylistUrl, (curr, tot, bytesDownloaded, bytesTotal) => {
        onProgress?.("downloading_audio", Math.round((curr / tot) * 100), bytesDownloaded, bytesTotal);
      });
    }

    // 4. Mux using FFmpeg
    onProgress?.("muxing", 0);
    await ffmpeg.writeFile("video.ts", videoData);
    if (audioData) {
      await ffmpeg.writeFile("audio.ts", audioData);
      // Merge HLS TS video and audio files into a single MP4
      await ffmpeg.exec(["-i", "video.ts", "-i", "audio.ts", "-c", "copy", "output.mp4"]);
    } else {
      // Convert single TS to MP4
      await ffmpeg.exec(["-i", "video.ts", "-c", "copy", "output.mp4"]);
    }

    // 5. Read output file
    const outputData = await ffmpeg.readFile("output.mp4");

    // 6. Stream output file to disk
    const { createDownloadStream } = await import("../v1/streamSaver");
    const stream = createDownloadStream(filename);
    try {
      stream.write(outputData);
      stream.close();
    } catch (err) {
      stream.error(err);
      throw err;
    }

    // Clean virtual FS
    await ffmpeg.deleteFile("video.ts");
    if (audioData) await ffmpeg.deleteFile("audio.ts");
    await ffmpeg.deleteFile("output.mp4");

    return "streamed";
  } catch (error) {
    console.error("FFmpeg.wasm muxing failed:", error);
    throw error;
  }
}
