import { parseSegments, selectBestMediaPlaylist } from "./playlistParser";

// --- IndexedDB Cache Configuration ---
const DB_NAME = "VidlordDownloadCache";
const DB_VERSION = 1;
const STORE_NAME = "segments";

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function getSegmentFromCache(key) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("IndexedDB read failed, falling back to network:", e);
    return null;
  }
}

async function saveSegmentToCache(key, data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("IndexedDB write failed:", e);
  }
}

async function clearCacheForPlaylist(playlistUrl) {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    return new Promise((resolve, reject) => {
      const request = store.openKeyCursor();
      request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          const key = cursor.key;
          if (typeof key === "string" && key.startsWith(playlistUrl)) {
            store.delete(key);
          }
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("IndexedDB clear failed:", e);
  }
}

/**
 * Downloads HLS stream chunks and merges them in memory.
 */
export async function downloadSegments(playlistUrl, onProgress, stream = null) {
  // 1. Fetch playlist
  const response = await fetch(playlistUrl);
  if (!response.ok) {
    throw new Error(`Playlist fetch failed: HTTP ${response.status}`);
  }
  const body = await response.text();

  // 2. Resolve Master Playlist to Media Playlist if nested
  let mediaPlaylistUrl = playlistUrl;
  let mediaPlaylistBody = body;
  const bestPlaylist = selectBestMediaPlaylist(body, playlistUrl);
  if (bestPlaylist) {
    mediaPlaylistUrl = bestPlaylist;
    const res = await fetch(mediaPlaylistUrl);
    if (!res.ok) {
      throw new Error(`Media playlist fetch failed: HTTP ${res.status}`);
    }
    mediaPlaylistBody = await res.text();
  }

  // 3. Parse segments
  const segments = parseSegments(mediaPlaylistBody, mediaPlaylistUrl);
  if (segments.length === 0) {
    throw new Error("No segments found in the HLS playlist.");
  }

  const total = segments.length;
  let downloadedCount = 0;
  
  // Memory optimization: do not create buffers array if streaming
  const buffers = stream ? null : new Array(total);
  const pendingWriteBuffers = new Map();
  let nextIndexToWrite = 0;
  let downloadedBytes = 0;

  // 4. Download segments concurrently (concurrency limit = 5)
  const concurrencyLimit = 5;
  const queue = segments.map((url, index) => ({ url, index }));

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;

      const cacheKey = `${mediaPlaylistUrl}_${item.index}`;
      
      // Try to read from cache first
      let buffer = await getSegmentFromCache(cacheKey);
      
      if (!buffer) {
        let retries = 15;
        let delay = 1000;

        while (retries > 0) {
          try {
            const res = await fetch(item.url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const arrayBuffer = await res.arrayBuffer();
            buffer = new Uint8Array(arrayBuffer);
            
            // Save to cache
            await saveSegmentToCache(cacheKey, buffer);
            break;
          } catch (e) {
            retries--;
            if (retries === 0) {
              throw new Error(`Failed to download segment ${item.index}: ${e.message}`);
            }
            console.warn(`Segment ${item.index} failed. Retrying in ${delay}ms... (Retries left: ${retries})`, e);
            await new Promise((r) => setTimeout(r, delay));
            delay = Math.min(delay * 1.5, 15000); // Exponential backoff up to 15s
          }
        }
      }

      downloadedBytes += buffer.length;

      if (stream) {
        // Queue chunk for sequential streaming write
        pendingWriteBuffers.set(item.index, buffer);
        
        // Flush sequential chunks to stream
        while (pendingWriteBuffers.has(nextIndexToWrite)) {
          const bufToWrite = pendingWriteBuffers.get(nextIndexToWrite);
          stream.write(bufToWrite);
          pendingWriteBuffers.delete(nextIndexToWrite);
          nextIndexToWrite++;
        }
      } else {
        buffers[item.index] = buffer;
      }

      downloadedCount++;
      if (onProgress) {
        const avgSegmentSize = downloadedBytes / downloadedCount;
        const estimatedTotalBytes = Math.round(avgSegmentSize * total);
        onProgress(downloadedCount, total, downloadedBytes, estimatedTotalBytes);
      }
    }
  }

  // Run concurrent workers
  const workers = Array.from({ length: Math.min(concurrencyLimit, total) }, worker);
  await Promise.all(workers);

  // Clear cache after successful download
  try {
    await clearCacheForPlaylist(mediaPlaylistUrl);
  } catch (err) {
    console.warn("Failed to clear segment cache:", err);
  }

  if (stream) {
    // Ensure all leftover chunks are written (should be empty)
    while (pendingWriteBuffers.has(nextIndexToWrite)) {
      const bufToWrite = pendingWriteBuffers.get(nextIndexToWrite);
      stream.write(bufToWrite);
      pendingWriteBuffers.delete(nextIndexToWrite);
      nextIndexToWrite++;
    }
    return null;
  }

  // 5. Merge buffers in memory
  let totalLength = 0;
  for (let buf of buffers) {
    totalLength += buf.length;
  }

  const merged = new Uint8Array(totalLength);
  let offset = 0;
  for (let buf of buffers) {
    merged.set(buf, offset);
    offset += buf.length;
  }

  return merged;
}
