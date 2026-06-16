import React, { useState, useEffect } from "react";
import { ArrowUp01Icon, RefreshIcon, DatabaseIcon, EyeIcon, CircleArrowUp01Icon, Alert01Icon } from "hugeicons-react";
import "./DashboardOverview.css";

import { adminFetch } from "../services/adminApi";

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    totalDownloads: 1420,
    successRate: 98.4,
    adClicks: 327,
    cacheSize: "1.85 GB",
    recentLogs: []
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchStats = () => {
    setIsLoading(true);
    adminFetch("/api/admin/dashboard/stats")
      .then((res) => {
        if (!res.ok) throw new Error("Dashboard stats server response not ok");
        return res.json();
      })
      .then((data) => {
        setStats({
          totalDownloads: data.total_downloads,
          successRate: data.success_rate,
          adClicks: data.ad_clicks,
          cacheSize: `${data.cache_size_gb.toFixed(2)} GB`,
          recentLogs: data.recent_logs || []
        });
      })
      .catch((err) => {
        console.error("Failed to load dashboard stats:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Dashboard Overview</h2>
          <p className="admin-page-subtitle">Real-time status snapshot of Vidlord engines</p>
        </div>
        <button className="admin-btn-secondary" onClick={fetchStats} disabled={isLoading}>
          <RefreshIcon size={16} className={isLoading ? "spin" : ""} />
          <span>Refresh stats</span>
        </button>
      </div>

      {/* Grid: Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Total Downloads</span>
            <div className="stat-card-icon-box primary">
              <CircleArrowUp01Icon size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.totalDownloads}</div>
          <div className="stat-card-footer">
            <span className="trend-up">
              <ArrowUp01Icon size={14} />
              12%
            </span>
            <span className="trend-label">since yesterday</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Scraper Success Rate</span>
            <div className="stat-card-icon-box success">
              <EyeIcon size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.successRate}%</div>
          <div className="stat-card-footer">
            <span className="trend-up">
              <ArrowUp01Icon size={14} />
              0.2%
            </span>
            <span className="trend-label">vs normal baseline</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Ad Click Logs</span>
            <div className="stat-card-icon-box warning">
              <RefreshIcon size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.adClicks}</div>
          <div className="stat-card-footer">
            <span className="trend-up">
              <ArrowUp01Icon size={14} />
              8.5%
            </span>
            <span className="trend-label">conversion estimate</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-label">Server Cache Size</span>
            <div className="stat-card-icon-box info">
              <DatabaseIcon size={20} />
            </div>
          </div>
          <div className="stat-card-value">{stats.cacheSize}</div>
          <div className="stat-card-footer">
            <span className="trend-warn">Auto-Purge active</span>
            <span className="trend-label">at 85% disk limit</span>
          </div>
        </div>
      </div>

      {/* Audit Log Table Section */}
      <div className="audit-section">
        <h3 className="audit-title">Recent Extraction & Download Audits</h3>
        <div className="table-responsive">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Platform</th>
                <th>Format/Quality</th>
                <th>Target URL</th>
                <th>Status</th>
                <th>File Size</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentLogs.map((log) => (
                <tr key={log.id}>
                  <td className="log-time">{log.timestamp}</td>
                  <td>
                    <span className={`badge-platform ${log.platform}`}>
                      {log.platform.toUpperCase()}
                    </span>
                  </td>
                  <td className="log-quality">{log.quality}</td>
                  <td className="log-url" title={log.url}>
                    {log.url.length > 50 ? log.url.substring(0, 48) + "..." : log.url}
                  </td>
                  <td>
                    <span className={`badge-status ${log.status.toLowerCase()}`}>
                      {log.status}
                    </span>
                    {log.error && (
                      <span className="log-error-tooltip" title={log.error}>
                        <Alert01Icon size={12} style={{ marginLeft: "4px", color: "#ef4444", verticalAlign: "middle" }} />
                      </span>
                    )}
                  </td>
                  <td className="log-size">{log.size}</td>
                </tr>
              ))}
              {stats.recentLogs.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    No recent download logs available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
