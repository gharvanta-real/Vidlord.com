import React, { useState, useEffect } from "react";
import { ArrowRight01Icon, ClipboardIcon, Shield01Icon, FlashIcon, SparklesIcon, FileVideoIcon, Layers01Icon, GlobeIcon, Download01Icon } from "hugeicons-react";
import Steps from "./Steps";
import Faq from "./Faq";
import AdRevenue from "./AdRevenue";
import SponsorCard from "./SponsorCard";
import NetworkAdBanner from "./NetworkAdBanner";
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

const InstagramIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

const TikTokIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.97 1.2 2.27 2.05 3.71 2.44v3.9c-1.97-.07-3.83-.95-5.14-2.42-.09.13-.19.26-.29.39-.08 3.51.02 7.02-.1 10.52-.28 2.39-1.54 4.58-3.48 5.76-2.18 1.34-5.01 1.52-7.34.46C2.26 23.77.72 21.05.6 18.23c-.26-3.8 2.37-7.44 6.16-8.27 1.23-.28 2.51-.18 3.68.27v4.06c-1.1-.65-2.52-.69-3.66.08-1.22.8-1.83 2.32-1.5 3.75.3 1.37 1.53 2.45 2.94 2.51 1.66.11 3.16-1.01 3.42-2.65.17-1.02.1-2.07.11-3.11-.02-5.06-.01-10.13-.02-15.2z" />
  </svg>
);

const XIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon = (props) => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" {...props}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// History actions SVG Icons
const CopyIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
);

export default function DownloadInput({ 
  onExtract, 
  isLoading, 
  error, 
  onClearError,
  title,
  subtitle,
  placeholder,
  navigate,
  currentPath,
  adCount,
  onAdClick,
  steps,
  faqs,
  bannerEnabled,
  bannerScript
}) {
  const [url, setUrl] = useState("");
  const [detectedUrl, setDetectedUrl] = useState("");
  const [showClipboardBanner, setShowClipboardBanner] = useState(false);
  const checkClipboard = async () => {
    if (!navigator.clipboard || !navigator.clipboard.readText) return;
    try {
      if (document.hasFocus()) {
        const text = await navigator.clipboard.readText();
        const cleanText = text.trim();
        
        const isValid = 
          cleanText.includes("youtube.com/") ||
          cleanText.includes("youtu.be/") ||
          cleanText.includes("instagram.com/") ||
          cleanText.includes("tiktok.com/") ||
          cleanText.includes("twitter.com/") ||
          cleanText.includes("x.com/") ||
          cleanText.includes("facebook.com/") ||
          cleanText.includes("fb.watch/") ||
          cleanText.includes("vimeo.com/");
          
        if (isValid && cleanText !== url) {
          setDetectedUrl(cleanText);
          setShowClipboardBanner(true);
        } else {
          setShowClipboardBanner(false);
        }
      }
    } catch (err) {
      // Permission prompt fail is safe to ignore
    }
  };

  useEffect(() => {
    window.addEventListener("focus", checkClipboard);
    const timer = setTimeout(checkClipboard, 800);
    
    return () => {
      window.removeEventListener("focus", checkClipboard);
      clearTimeout(timer);
    };
  }, [url]);

  const handleAcceptClipboard = () => {
    setUrl(detectedUrl);
    setShowClipboardBanner(false);
    onExtract(detectedUrl);
  };

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
        <h1 className="di-hero-title">{title}</h1>
        <p className="di-hero-subtitle">{subtitle}</p>
      </div>

      {/* 2. Main Download Bar */}
      <div className="di-form-wrapper">
        <div className="di-split-bg">
          <div className="di-hero-artifacts"></div>
        </div>
        <form onSubmit={handleSubmit} className="di-form">
          <div className="di-input-wrapper">
            <input
              type="url"
              placeholder={placeholder}
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
              <ClipboardIcon size={18} className="di-paste-icon" />
            </button>
            <button 
              type="submit" 
              className="di-integrated-download-btn" 
              disabled={isLoading || !url.trim()}
              title="Download"
            >
              <Download01Icon size={18} />
            </button>
          </div>
          <button 
            type="submit" 
            className="di-download-btn" 
            disabled={isLoading || !url.trim()}
          >
            <span>Download</span>
            <ArrowRight01Icon size={18} />
          </button>
        </form>
      </div>

      {/* Dynamic Sponsor Cards & Banners */}
      <div className="di-sponsors-ads-wrapper" style={{ margin: "20px auto 0", maxWidth: "600px", width: "100%" }}>
        <SponsorCard adCount={adCount} onAdClick={onAdClick} />
        
        {bannerEnabled && bannerScript && (
          <div 
            className="custom-banner-script-container"
            style={{ marginTop: "15px", display: "flex", justifyContent: "center" }}
            ref={(el) => {
              if (el) {
                el.innerHTML = "";
                const range = document.createRange();
                const frag = range.createContextualFragment(bannerScript);
                el.appendChild(frag);
              }
            }}
          />
        )}
      </div>

      {/* Clipboard Auto-Detect Toast Banner */}
      {showClipboardBanner && detectedUrl && (
        <div className="di-clipboard-toast" onClick={handleAcceptClipboard}>
          <div className="di-toast-glow"></div>
          <div className="di-toast-content">
            <span className="di-toast-sparkle">✨</span>
            <span className="di-toast-text">
              Link in Clipboard: <strong>{detectedUrl.substring(0, 32)}...</strong>
            </span>
            <button className="di-toast-action-btn">Tap to Paste & Download</button>
          </div>
        </div>
      )}

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
          <div 
            onClick={() => navigate("/youtube-downloader")} 
            className={`di-platform-item ${currentPath === "/youtube-downloader" ? "di-active" : ""}`}
          >
            <YoutubeIcon />
            <span>YouTube</span>
          </div>
          <div 
            onClick={() => navigate("/youtube-to-mp3")} 
            className={`di-platform-item ${currentPath === "/youtube-to-mp3" ? "di-active" : ""}`}
          >
            <Layers01Icon size={16} />
            <span>YouTube to MP3</span>
          </div>
          <div 
            onClick={() => navigate("/instagram-downloader")} 
            className={`di-platform-item ${currentPath === "/instagram-downloader" ? "di-active" : ""}`}
          >
            <InstagramIcon />
            <span>Instagram</span>
          </div>
          <div 
            onClick={() => navigate("/tiktok-video-download")} 
            className={`di-platform-item ${currentPath === "/tiktok-video-download" ? "di-active" : ""}`}
          >
            <TikTokIcon />
            <span>TikTok</span>
          </div>
          <div 
            onClick={() => navigate("/x-downloader")} 
            className={`di-platform-item ${currentPath === "/x-downloader" ? "di-active" : ""}`}
          >
            <XIcon />
            <span>X / Twitter</span>
          </div>
          <div 
            onClick={() => navigate("/facebook-downloader")} 
            className={`di-platform-item ${currentPath === "/facebook-downloader" ? "di-active" : ""}`}
          >
            <FacebookIcon />
            <span>Facebook</span>
          </div>
          <div 
            onClick={() => navigate("/vimeo-downloader")} 
            className={`di-platform-item ${currentPath === "/vimeo-downloader" ? "di-active" : ""}`}
          >
            <VimeoIcon />
            <span>Vimeo</span>
          </div>
        </div>
      </div>


      {/* 5. How To Steps Section */}
      <div className="di-desktop-only-section">
        <Steps steps={steps} />
      </div>

      {/* 6. Features Section (Below the fold) */}
      <div className="di-features di-desktop-only-section">
        <h2 className="di-features-title">Why Use Vidlord?</h2>
        <p className="di-features-desc">
          A lightweight, high-performance tool built for low-spec systems and fast download requirements.
        </p>
        <div className="di-grid">
          <div className="di-card">
            <div className="di-card-header-row">
              <h3 className="di-card-header">16x Speed</h3>
              <FlashIcon size={24} className="di-card-icon" />
            </div>
            <p className="di-card-text">Downloads segments concurrently, bypassing standard server-side bandwidth caps.</p>
          </div>
          <div className="di-card">
            <div className="di-card-header-row">
              <h3 className="di-card-header">Lossless Muxing</h3>
              <Layers01Icon size={24} className="di-card-icon" />
            </div>
            <p className="di-card-text">Audio and video are merged natively using FFmpeg with zero transcoding quality loss.</p>
          </div>
          <div className="di-card">
            <div className="di-card-header-row">
              <h3 className="di-card-header">100% Free</h3>
              <Shield01Icon size={24} className="di-card-icon" />
            </div>
            <p className="di-card-text">No registration, no limits, and no tracking cookies. Runs completely on your own server.</p>
          </div>
        </div>
      </div>

      {/* 7. FAQ Section */}
      <div className="di-desktop-only-section">
        <Faq faqs={faqs} />
      </div>

      {/* 8. Ad Revenue Model Section */}
      <div className="di-desktop-only-section">
        <AdRevenue />
      </div>
    </div>
  );
}
