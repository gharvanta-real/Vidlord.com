import React from "react";
import "./Footer.css";

export default function Footer({ onOpenPrivacy, onOpenTerms }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-left" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src="/favicon.png" alt="Logo" style={{ height: "20px", width: "20px", objectFit: "contain" }} />
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
