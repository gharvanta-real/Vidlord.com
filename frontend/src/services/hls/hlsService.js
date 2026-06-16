import { downloadSegments } from "./v1/segmentFetcher";
import { muxHlsToMp4 } from "./v2/ffmpegMuxer";

/**
 * Downloads an HLS stream directly inside the browser and triggers download of the assembled TS video.
 * @param {string} playlistUrl - The HLS .m3u8 playlist URL.
 * @param {object} options - Options containing callbacks.
 * @param {string} options.filename - The target file name for the downloaded video.
 * @param {function} options.onProgress - Callback triggered when progress updates: (current, total).
 */
export async function downloadHlsStream(playlistUrl, { filename = "video.ts", onProgress } = {}) {
  try {
    const { createDownloadStream } = await import("./v1/streamSaver");
    const safeFilename = filename.endsWith(".ts") ? filename : `${filename}.ts`;
    const stream = createDownloadStream(safeFilename);
    
    try {
      await downloadSegments(playlistUrl, onProgress, stream);
      stream.close();
    } catch (err) {
      stream.error(err);
      throw err;
    }
    
    return "streamed";
  } catch (error) {
    console.error("Client HLS Downloader failed:", error);
    throw error;
  }
}

/**
 * Downloads and muxes separate video & audio HLS playlists into a single playable MP4 natively in the browser.
 */
export async function downloadAndMuxHlsStream(videoUrl, audioUrl, { filename = "video.mp4", onProgress } = {}) {
  try {
    return await muxHlsToMp4(videoUrl, audioUrl, { filename, onProgress });
  } catch (error) {
    console.error("Client HLS Muxer failed:", error);
    throw error;
  }
}
