import React, { useState, useEffect } from "react";
import { FloppyDiskIcon, Alert01Icon } from "hugeicons-react";
import "./ScraperHealth.css";
import { adminFetch } from "../services/adminApi";

export default function ScraperHealth() {
  const [scrapers, setScrapers] = useState([
    { id: "youtube", name: "YouTube Downloader", status: "healthy", latency: "115ms", rate: "99.2%" },
    { id: "youtube-mp3", name: "YouTube to MP3", status: "healthy", latency: "245ms", rate: "98.7%" },
    { id: "instagram", name: "Instagram Saver", status: "healthy", latency: "185ms", rate: "97.4%" },
    { id: "tiktok", name: "TikTok No-Watermark", status: "healthy", latency: "95ms", rate: "99.5%" },
    { id: "x", name: "X (Twitter) GIF Engine", status: "warning", latency: "420ms", rate: "82.1%", message: "Rate limits detected" },
    { id: "facebook", name: "Facebook Parser", status: "healthy", latency: "190ms", rate: "96.8%" },
    { id: "vimeo", name: "Vimeo HD Engine", status: "healthy", latency: "130ms", rate: "99.0%" }
  ]);

  const [config, setConfig] = useState(null);
  const [userAgent, setUserAgent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/config")
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setUserAgent(data.user_agent);
      })
      .catch(err => console.error("Failed to load user agent config:", err));
  }, []);

  const handleSaveHeaders = () => {
    if (!config) return;
    setIsLoading(true);
    const updatedConfig = { ...config, user_agent: userAgent };
    
    adminFetch("/api/admin/config", {
      method: "POST",
      body: JSON.stringify(updatedConfig)
    })
      .then(res => {
        if (res.ok) {
          setConfig(updatedConfig);
          alert("Scraper headers updated successfully! Axum requests will now bypass blockers using new headers.");
        } else {
          alert("Error: Failed to save scraper headers on server.");
        }
      })
      .catch(err => alert("Error: Network failure saving headers: " + err))
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Scraper Health & Status</h2>
          <p className="admin-page-subtitle">Monitor extraction performance and configure crawler request headers</p>
        </div>
      </div>

      {/* Grid: Health Status */}
      <div className="scraper-grid">
        {scrapers.map((s) => (
          <div key={s.id} className="scraper-card">
            <div className="scraper-card-header">
              <h4 className="scraper-card-name">{s.name}</h4>
              <span className={`scraper-status-dot ${s.status}`}></span>
            </div>
            
            <div className="scraper-metrics">
              <div className="scraper-metric-row">
                <span className="metric-label">Latency:</span>
                <span className="metric-value">{s.latency}</span>
              </div>
              <div className="scraper-metric-row">
                <span className="metric-label">Success Rate:</span>
                <span className="metric-value">{s.rate}</span>
              </div>
            </div>

            {s.message && (
              <div className="scraper-alert">
                <Alert01Icon size={12} />
                <span>{s.message}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Headers manager */}
      <div className="scraper-details-layout">
        <div className="scraper-headers-container">
          <h3 className="section-title">User-Agent Headers Manager</h3>
          <p className="section-desc">Configure the browser identity sent to bypass extraction firewalls and secure scrapers from blocklists.</p>
          
          <div className="headers-form">
            <div className="headers-group">
              <label className="headers-label">Scraper User-Agent String</label>
              <textarea
                className="headers-textarea"
                rows="5"
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
              ></textarea>
            </div>
            
            <button className="admin-btn-primary" onClick={handleSaveHeaders} disabled={isLoading || !config}>
              <FloppyDiskIcon size={16} />
              <span>{isLoading ? "Saving..." : "Save Headers"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
