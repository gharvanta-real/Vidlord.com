import React, { useState, useEffect } from "react";
import { Delete01Icon, FloppyDiskIcon, DatabaseIcon, Tick01Icon } from "hugeicons-react";
import "./CacheManager.css";
import { adminFetch } from "../services/adminApi";

export default function CacheManager() {
  const [stats, setStats] = useState({ file_count: 0, total_size_mb: 0.0, files: [] });
  const [autoPurgeHours, setAutoPurgeHours] = useState(6);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = () => {
    adminFetch("/api/admin/cache/stats")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Failed to load cache stats:", err));
  };

  useEffect(() => {
    fetchStats();
    const savedHours = localStorage.getItem("cache_purge_hours") || "6";
    setAutoPurgeHours(parseInt(savedHours));
  }, []);

  const handlePurgeCache = () => {
    if (window.confirm("WARNING: Are you sure you want to delete all cached video files from the server? This action cannot be undone.")) {
      setIsLoading(true);
      adminFetch("/api/admin/cache/purge", { method: "POST" })
        .then(res => {
          if (res.ok) {
            alert("Server cache successfully purged!");
            fetchStats();
          } else {
            alert("Error: Failed to purge cache.");
          }
        })
        .catch(err => alert("Error: Network failure when purging cache: " + err))
        .finally(() => setIsLoading(false));
    }
  };

  const handleSavePurgeHours = () => {
    localStorage.setItem("cache_purge_hours", autoPurgeHours);
    alert(`Auto-cleanup cron scheduler updated to delete files older than ${autoPurgeHours} hours.`);
  };

  const totalUsedGb = stats.total_size_mb / 1024;
  const freeSpaceGb = Math.max(30 - totalUsedGb, 0);
  const percentUsed = Math.min(Math.round((stats.total_size_mb / 30720) * 100), 100) || 1;

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Cache & Storage Manager</h2>
          <p className="admin-page-subtitle">Monitor server disk storage and clean download caches</p>
        </div>
        <button 
          className="admin-btn-secondary danger" 
          onClick={handlePurgeCache} 
          disabled={isLoading || stats.file_count === 0}
        >
          <Delete01Icon size={16} />
          <span>{isLoading ? "Purging..." : "Purge Cache"}</span>
        </button>
      </div>

      <div className="cache-layout">
        
        {/* Left: Gauge & Auto Purge */}
        <div className="cache-stats-container">
          <h3 className="section-title">Disk Storage Staging</h3>
          <p className="section-desc">Visual status of the SSD partition where downloads are muxed.</p>

          <div className="disk-gauge-section">
            <div className="disk-gauge-circle">
              <svg viewBox="0 0 36 36" className="circular-chart">
                <path className="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path className="circle"
                  strokeDasharray={`${percentUsed}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" className="percentage">{percentUsed}%</text>
              </svg>
            </div>
            
            <div className="disk-gauge-labels">
              <div className="gauge-label-col">
                <span className="label-dot used"></span>
                <div className="label-text-box">
                  <span className="label-title">Used Space</span>
                  <span className="label-value">{stats.total_size_mb.toFixed(1)} MB</span>
                </div>
              </div>
              <div className="gauge-label-col">
                <span className="label-dot free"></span>
                <div className="label-text-box">
                  <span className="label-title">Free Space</span>
                  <span className="label-value">{freeSpaceGb.toFixed(2)} GB</span>
                </div>
              </div>
            </div>
          </div>

          <hr className="cache-divider" />

          {/* Auto purge rules */}
          <div className="purge-rules-form">
            <h4 className="purge-rules-title">Cron Auto-Purge Duration</h4>
            <p className="purge-rules-desc">Server task automatically deletes download files older than selected hours.</p>
            
            <div className="purge-input-row">
              <div className="purge-slider-wrapper">
                <input
                  type="range"
                  min="1"
                  max="24"
                  className="purge-range-slider"
                  value={autoPurgeHours}
                  onChange={(e) => setAutoPurgeHours(parseInt(e.target.value))}
                />
                <div className="purge-range-labels">
                  <span>1 Hour</span>
                  <span className="active-label">{autoPurgeHours} Hours</span>
                  <span>24 Hours</span>
                </div>
              </div>

              <button className="admin-btn-primary" onClick={handleSavePurgeHours}>
                <FloppyDiskIcon size={16} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Cached files log list */}
        <div className="cache-files-container">
          <h3 className="section-title">Active Cached Files Log ({stats.file_count})</h3>
          <p className="section-desc">Temporary files stored in the directory serving direct server requests.</p>

          <div className="cache-files-list">
            {stats.files && stats.files.map((file, index) => (
              <div key={index} className="cache-file-item">
                <div className="cache-file-icon-box">
                  <DatabaseIcon size={18} />
                </div>
                <div className="cache-file-details">
                  <span className="cache-file-name" title={file.name}>{file.name}</span>
                  <span className="cache-file-meta">{file.size_mb} MB &bull; {file.age}</span>
                </div>
              </div>
            ))}
            {(!stats.files || stats.files.length === 0) && (
              <div className="empty-cache-message">
                <Tick01Icon size={24} style={{ color: "#10b981", marginBottom: "8px" }} />
                <span>Cache is fully purged. No files active.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
