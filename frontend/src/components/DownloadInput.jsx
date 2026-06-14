import React, { useState } from "react";
import { ArrowRight, Clipboard, Shield, Zap, Sparkles, FileVideo, Layers, Globe } from "lucide-react";
import Steps from "./Steps";
import Faq from "./Faq";
import AdRevenue from "./AdRevenue";
import "./DownloadInput.css";

const YoutubeIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
    <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const VimeoIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
    <path d="M22.396 7.168c-.116 2.536-1.887 6.007-5.313 10.413-3.513 4.52-6.48 6.78-8.9 6.78-1.502 0-2.78-1.39-3.83-4.17-.707-2.59-1.416-5.18-2.12-7.771-.776-2.852-1.614-4.28-2.514-4.28-.198 0-.88.412-2.051 1.24L0 7.82c1.233-1.08 2.455-2.162 3.667-3.243 1.684-1.5 2.929-2.295 3.73-2.385 1.885-.21 3.037 1.072 3.457 3.847.46 3.03 1.767 7.738 2.052 8.796.618 2.294 1.298 3.44 2.038 3.44.57 0 1.268-.746 2.091-2.24.822-1.494 1.266-2.628 1.333-3.402.13-1.494-.378-2.242-1.527-2.242-.519 0-1.055.117-1.61.353 1.062-3.486 3.094-5.205 6.096-5.158 2.22.037 3.264 1.488 3.13 4.354z" />
  </svg>
);

export default function DownloadInput({ onExtract, isLoading, error, onClearError }) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim() && !isLoading) {
      onExtract(url.trim());
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (err) {
      console.warn("Clipboard read permission denied", err);
    }
  };

  return (
    <div className="di-container">
      {/* 1. Hero Title & Subtitle */}
      <div className="di-hero">
        <h1 className="di-hero-title">Universal Video Downloader</h1>
        <p className="di-hero-subtitle">
          Download high-quality video and audio streams from YouTube and other platforms instantly
        </p>
      </div>

      {/* 2. Main Download Bar */}
      <form onSubmit={handleSubmit} className="di-form">
        <div className="di-input-wrapper">
          <input
            type="url"
            placeholder="Paste video URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="di-input"
            disabled={isLoading}
            required
          />
          <button 
            type="button" 
            onClick={handlePaste} 
            className="di-paste-btn"
            title="Paste from clipboard"
          >
            <Clipboard size={18} className="di-paste-icon" />
          </button>
        </div>
        <button 
          type="submit" 
          className="di-download-btn" 
          disabled={isLoading || !url.trim()}
        >
          <span>Download</span>
          <ArrowRight size={18} />
        </button>
      </form>

      {/* 3. Slider Loading Bar */}
      {isLoading && (
        <div className="di-slider-container">
          <div className="animate-slide di-slider-bar" />
        </div>
      )}

      {/* 3.5 Error & Cloudflare Bypass Guide Card */}
      {error && (
        <div className="di-error-card">
          <div className="di-error-header">
            <span>Extraction Failed</span>
            <button onClick={onClearError} className="di-error-close">×</button>
          </div>
          <p className="di-error-text">{error}</p>
          
          {(error.includes("403") || error.toLowerCase().includes("forbidden") || error.toLowerCase().includes("cloudflare")) && (
            <div className="di-guide">
              <div className="di-guide-title">How to download from Cloudflare-protected sites:</div>
              <ol className="di-guide-steps">
                <li>Open the video page in your browser.</li>
                <li>Press <strong>F12</strong> (or right-click and select <strong>Inspect</strong>).</li>
                <li>Go to the <strong>Network</strong> tab, reload the page, play the video, and filter/search for <code>.m3u8</code>.</li>
                <li>Copy the playlist URL (e.g. starting with <code>https://...</code>) and paste it in the field above!</li>
              </ol>
            </div>
          )}
        </div>
      )}

      {/* 4. Supported Platforms & Formats */}
      <div className="di-platforms">
        <div className="di-platform-grid">
          <div className="di-platform-item">
            <YoutubeIcon style={{ color: "var(--text-main)" }} />
            <span>YouTube</span>
          </div>
          <div className="di-platform-item">
            <VimeoIcon style={{ color: "var(--text-main)" }} />
            <span>Vimeo</span>
          </div>
          <div className="di-platform-item">
            <FileVideo size={16} style={{ color: "var(--text-main)" }} />
            <span>Direct MP4</span>
          </div>
          <div className="di-platform-item">
            <Layers size={16} style={{ color: "var(--text-main)" }} />
            <span>HLS (.m3u8)</span>
          </div>
          <div className="di-platform-item">
            <Globe size={16} style={{ color: "var(--text-main)" }} />
            <span>Generic Stream</span>
          </div>
        </div>
      </div>

      {/* 5. How To Steps Section */}
      <Steps />

      {/* 6. Features Section (Below the fold) */}
      <div className="di-features">
        <h2 className="di-features-title">Why Use Vidlord?</h2>
        <p className="di-features-desc">
          A lightweight, high-performance tool built for low-spec systems and fast download requirements.
        </p>
        <div className="di-grid">
          <div className="di-card">
            <Zap size={24} className="di-card-icon" />
            <h3 className="di-card-header">16x Speed</h3>
            <p className="di-card-text">Downloads segments concurrently, bypassing standard server-side bandwidth caps.</p>
          </div>
          <div className="di-card">
            <Sparkles size={24} className="di-card-icon" />
            <h3 className="di-card-header">Lossless Muxing</h3>
            <p className="di-card-text">Audio and video are merged natively using FFmpeg with zero transcoding quality loss.</p>
          </div>
          <div className="di-card">
            <Shield size={24} className="di-card-icon" />
            <h3 className="di-card-header">100% Free</h3>
            <p className="di-card-text">No registration, no limits, and no tracking cookies. Runs completely on your own server.</p>
          </div>
        </div>
      </div>

      {/* 7. FAQ Section */}
      <Faq />

      {/* 8. Ad Revenue Model Section */}
      <AdRevenue />
    </div>
  );
}
