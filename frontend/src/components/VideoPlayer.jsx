import React, { useEffect, useRef, useState } from "react";

export default function VideoPlayer({ url, poster }) {
  const videoRef = useRef(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let hls = null;
    let isDestroyed = false;

    const initPlayer = (HlsClass) => {
      if (isDestroyed || !videoRef.current) return;
      const video = videoRef.current;
      
      const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
      const isM3u8 = url.includes(".m3u8") || url.includes("m3u8");

      if (isM3u8) {
        if (HlsClass && HlsClass.isSupported()) {
          hls = new HlsClass();
          hls.loadSource(proxyUrl);
          hls.attachMedia(video);
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = proxyUrl;
        } else {
          setLoadError(true);
        }
      } else {
        video.src = proxyUrl;
      }
    };

    if (url.includes(".m3u8") || url.includes("m3u8")) {
      if (window.Hls) {
        initPlayer(window.Hls);
      } else {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js";
        script.async = true;
        script.onload = () => {
          if (window.Hls) {
            initPlayer(window.Hls);
          }
        };
        script.onerror = () => {
          setLoadError(true);
        };
        document.body.appendChild(script);
      }
    } else {
      initPlayer(null);
    }

    return () => {
      isDestroyed = true;
      if (hls) {
        hls.destroy();
      }
    };
  }, [url]);

  return (
    <div style={styles.playerContainer}>
      {loadError ? (
        <div style={styles.errorText}>Unable to load stream preview.</div>
      ) : (
        <video
          ref={videoRef}
          controls
          playsInline
          poster={poster}
          style={styles.video}
        />
      )}
    </div>
  );
}

const styles = {
  playerContainer: {
    width: "100%",
    aspectRatio: "16/9",
    borderRadius: "14px",
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
  },
  video: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
  errorText: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    color: "var(--text-muted)",
    fontSize: "14px",
  },
};
