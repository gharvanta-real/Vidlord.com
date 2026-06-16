import React from "react";
import "./Footer.css";

export default function Footer({ theme, onOpenPrivacy, onOpenTerms, navigate }) {
  const currentYear = new Date().getFullYear();

  const handleLinkClick = (e, path) => {
    e.preventDefault();
    if (navigate) {
      navigate(path);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="footer">
      <div className="footer-seo-grid">
        <div className="footer-seo-column">
          <h4 className="footer-seo-title">YouTube Downloaders</h4>
          <ul className="footer-seo-list">
            <li><a href="/youtube-downloader" onClick={(e) => handleLinkClick(e, "/youtube-downloader")}>YouTube Video Downloader</a></li>
            <li><a href="/youtube-to-mp3" onClick={(e) => handleLinkClick(e, "/youtube-to-mp3")}>YouTube to MP3 Converter</a></li>
            <li><a href="/youtube-downloader" onClick={(e) => handleLinkClick(e, "/youtube-downloader")}>Download YouTube Shorts</a></li>
            <li><a href="/youtube-to-mp3" onClick={(e) => handleLinkClick(e, "/youtube-to-mp3")}>Extract YouTube Audio</a></li>
          </ul>
        </div>
        <div className="footer-seo-column">
          <h4 className="footer-seo-title">Instagram & TikTok</h4>
          <ul className="footer-seo-list">
            <li><a href="/instagram-downloader" onClick={(e) => handleLinkClick(e, "/instagram-downloader")}>Instagram Reels Downloader</a></li>
            <li><a href="/instagram-downloader" onClick={(e) => handleLinkClick(e, "/instagram-downloader")}>Instagram Video Downloader</a></li>
            <li><a href="/tiktok-video-download" onClick={(e) => handleLinkClick(e, "/tiktok-video-download")}>TikTok Video Downloader</a></li>
            <li><a href="/tiktok-video-download" onClick={(e) => handleLinkClick(e, "/tiktok-video-download")}>TikTok No Watermark Save</a></li>
          </ul>
        </div>
        <div className="footer-seo-column">
          <h4 className="footer-seo-title">Facebook & Twitter</h4>
          <ul className="footer-seo-list">
            <li><a href="/facebook-downloader" onClick={(e) => handleLinkClick(e, "/facebook-downloader")}>Facebook Video Downloader</a></li>
            <li><a href="/facebook-downloader" onClick={(e) => handleLinkClick(e, "/facebook-downloader")}>Download FB Reels Online</a></li>
            <li><a href="/x-downloader" onClick={(e) => handleLinkClick(e, "/x-downloader")}>X / Twitter Video Downloader</a></li>
            <li><a href="/x-downloader" onClick={(e) => handleLinkClick(e, "/x-downloader")}>Save Twitter GIFs Online</a></li>
          </ul>
        </div>
        <div className="footer-seo-column">
          <h4 className="footer-seo-title">Other Video Engines</h4>
          <ul className="footer-seo-list">
            <li><a href="/vimeo-downloader" onClick={(e) => handleLinkClick(e, "/vimeo-downloader")}>Vimeo Video Downloader</a></li>
            <li><a href="/vimeo-downloader" onClick={(e) => handleLinkClick(e, "/vimeo-downloader")}>Download Vimeo HD MP4</a></li>
            <li><a href="/" onClick={(e) => handleLinkClick(e, "/")}>Universal Video Downloader</a></li>
            <li><a href="/" onClick={(e) => handleLinkClick(e, "/")}>Free Multi-Platform Downloader</a></li>
          </ul>
        </div>
      </div>

      <div className="footer-divider"></div>

      <div className="footer-container">
        <div className="footer-left" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img 
            src={theme === "light" ? "/logo-light.png" : "/logo-dark.png"} 
            alt="Logo" 
            style={{ height: "35px", width: "auto", objectFit: "contain" }} 
          />
          <span className="footer-desc">High-speed video downloader engine</span>
        </div>
        <div className="footer-links">
          <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); onOpenTerms(); }}>Terms</a>
          <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); onOpenPrivacy(); }}>Privacy</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
        </div>
        <div className="footer-right">
          <p className="footer-copy">&copy; {currentYear} Vidlord. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

