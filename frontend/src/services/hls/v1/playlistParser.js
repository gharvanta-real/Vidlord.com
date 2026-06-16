/**
 * Resolves relative URLs to absolute URLs based on a base URL.
 */
export function resolveUrl(base, relative) {
  if (relative.startsWith("http://") || relative.startsWith("https://")) {
    return relative;
  }
  try {
    const baseUrl = new URL(base);
    const resolved = new URL(relative, baseUrl);
    return resolved.href;
  } catch (e) {
    console.error("Failed to resolve URL:", e);
    return relative;
  }
}

/**
 * Parses a master playlist to select the highest bandwidth media playlist.
 */
export function selectBestMediaPlaylist(playlistBody, baseUrl) {
  if (!playlistBody.includes("#EXT-X-STREAM-INF")) {
    return null;
  }

  const streams = [];
  const lines = playlistBody.split("\n");
  let currentStreamInf = null;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("#EXT-X-STREAM-INF:")) {
      currentStreamInf = trimmed;
    } else if (!trimmed.startsWith("#")) {
      if (currentStreamInf) {
        streams.push({ inf: currentStreamInf, url: trimmed });
        currentStreamInf = null;
      }
    }
  }

  if (streams.length === 0) return null;

  let bestUrl = streams[0].url;
  let maxBandwidth = 0;

  for (let stream of streams) {
    const match = stream.inf.match(/BANDWIDTH=(\d+)/);
    if (match) {
      const bw = parseInt(match[1], 10);
      if (bw > maxBandwidth) {
        maxBandwidth = bw;
        bestUrl = stream.url;
      }
    }
  }

  return resolveUrl(baseUrl, bestUrl);
}

/**
 * Parses a media playlist body to retrieve all segment URLs.
 */
export function parseSegments(playlistBody, baseUrl) {
  const lines = playlistBody.split("\n");
  const segments = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    segments.push(resolveUrl(baseUrl, trimmed));
  }

  return segments;
}
