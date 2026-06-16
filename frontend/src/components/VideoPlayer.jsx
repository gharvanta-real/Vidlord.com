import React, { useEffect, useRef, useState } from "react";

const API_BASE = import.meta.env.DEV 
  ? `http://${window.location.hostname}:8080` 
  : "";

export default function VideoPlayer({ url, poster }) {
  const videoRef = useRef(null);
  const [loadError, setLoadError] = useState(false);
  const [posterUrl, setPosterUrl] = useState(poster);

  useEffect(() => {
    setPosterUrl(poster);
    if (poster && poster.includes("maxresdefault.jpg")) {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth === 120) {
          setPosterUrl(poster.replace("maxresdefault.jpg", "hqdefault.jpg"));
        }
      };
      img.onerror = () => {
        setPosterUrl(poster.replace("maxresdefault.jpg", "hqdefault.jpg"));
      };
      img.src = poster;
    }
  }, [poster]);

  useEffect(() => {
    let hls = null;
    let player = null;
    let isDestroyed = false;

    // Load Plyr CSS and JS dynamically
    const loadPlyr = () => {
      if (!document.getElementById("plyr-css")) {
        const link = document.createElement("link");
        link.id = "plyr-css";
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.css";
        document.head.appendChild(link);
      }

      if (window.Plyr) {
        initPlayer(window.Hls, window.Plyr);
      } else {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.min.js";
        script.async = true;
        script.onload = () => initPlayer(window.Hls, window.Plyr);
        document.body.appendChild(script);
      }
    };

    const initPlayer = (HlsClass, PlyrClass) => {
      if (isDestroyed || !videoRef.current) return;
      const video = videoRef.current;
      
      const proxyUrl = `${API_BASE}/api/proxy?url=${encodeURIComponent(url)}`;
      const lowerUrl = url.toLowerCase();
      const isM3u8 = lowerUrl.includes(".m3u8") 
        || lowerUrl.includes("m3u8") 
        || lowerUrl.includes(".txt") 
        || lowerUrl.includes("master.txt") 
        || lowerUrl.includes("-v1-a1.txt")
        || lowerUrl.includes("hls3")
        || lowerUrl.includes("4flhlv");

      const plyrOptions = {
        controls: [
          'play-large', 'play', 'progress', 'current-time', 
          'mute', 'volume', 'settings', 'pip', 'fullscreen'
        ],
        settings: ['quality', 'speed', 'loop'],
        tooltips: { controls: true, seek: true },
        fullscreen: { enabled: true, fallback: true, iosNative: true }
      };

      if (isM3u8) {
        if (HlsClass && HlsClass.isSupported()) {
          hls = new HlsClass();
          hls.loadSource(proxyUrl);
          hls.attachMedia(video);
          
          hls.on(HlsClass.Events.MANIFEST_PARSED, () => {
            if (PlyrClass && !player) {
              player = new PlyrClass(video, plyrOptions);
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = proxyUrl;
          if (PlyrClass) {
            player = new PlyrClass(video, plyrOptions);
          }
        } else {
          setLoadError(true);
        }
      } else {
        video.src = proxyUrl;
        if (PlyrClass) {
          player = new PlyrClass(video, plyrOptions);
        }
      }
    };

    // Load Hls.js dynamically first
    const lowerUrl = url.toLowerCase();
    const isM3u8 = lowerUrl.includes(".m3u8") 
      || lowerUrl.includes("m3u8") 
      || lowerUrl.includes(".txt") 
      || lowerUrl.includes("master.txt") 
      || lowerUrl.includes("-v1-a1.txt")
      || lowerUrl.includes("hls3")
      || lowerUrl.includes("4flhlv");

    if (isM3u8) {
      if (window.Hls) {
        loadPlyr();
      } else {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.8/dist/hls.min.js";
        script.async = true;
        script.onload = loadPlyr;
        script.onerror = () => setLoadError(true);
        document.body.appendChild(script);
      }
    } else {
      loadPlyr();
    }

    return () => {
      isDestroyed = true;
      if (player) {
        player.destroy();
      }
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
          webkit-playsinline="true"
          poster={posterUrl}
          style={styles.video}
        />
      )}
    </div>
  );
}

const styles = {
  playerContainer: {
    width: "100%",
    maxHeight: "480px",
    borderRadius: "14px",
    overflow: "hidden",
    backgroundColor: "#000",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    width: "100%",
    height: "100%",
    maxHeight: "480px",
    objectFit: "contain",
  },
  errorText: {
    padding: "40px",
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: "14px",
  },
};
