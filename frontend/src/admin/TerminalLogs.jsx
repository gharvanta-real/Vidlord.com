import React, { useState, useEffect } from "react";
import { PlayIcon, FloppyDiskIcon, RefreshIcon, ComputerTerminal01Icon } from "hugeicons-react";
import "./TerminalLogs.css";
import { adminFetch } from "../services/adminApi";

export default function TerminalLogs() {
  const [activeTab, setActiveTab] = useState("scraper"); // "scraper" | "pm2"
  
  // 1. Scraper Test State
  const [testUrl, setTestUrl] = useState("");
  const [terminalLogs, setTerminalLogs] = useState([]);
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [userAgent, setUserAgent] = useState("");

  // 2. PM2 State
  const [pm2Logs, setPm2Logs] = useState([]);
  const [isRefreshingPm2, setIsRefreshingPm2] = useState(false);

  useEffect(() => {
    // Load config user agent
    adminFetch("/api/admin/config")
      .then(res => res.json())
      .then(data => {
        setUserAgent(data.user_agent);
      })
      .catch(err => console.error("Failed to load user agent for tester:", err));
  }, []);

  useEffect(() => {
    if (activeTab === "pm2") {
      handleRefreshPm2Logs();
    }
  }, [activeTab]);

  const handleRunScraperTest = (e) => {
    e.preventDefault();
    if (!testUrl.trim() || isRunningTest) return;

    setIsRunningTest(true);
    setTerminalLogs([`[${new Date().toLocaleTimeString()}] Spawning extraction test...`]);

    adminFetch("/api/admin/scraper/test", {
      method: "POST",
      body: JSON.stringify({ url: testUrl })
    })
      .then(res => res.json())
      .then(data => {
        setTerminalLogs(data.logs || []);
      })
      .catch(err => {
        setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [ERROR] Connection failed: ${err}`]);
      })
      .finally(() => {
        setIsRunningTest(false);
      });
  };

  const handleRefreshPm2Logs = () => {
    setIsRefreshingPm2(true);
    adminFetch("/api/admin/logs")
      .then(res => res.json())
      .then(data => {
        setPm2Logs(data);
      })
      .catch(err => {
        console.error("Failed to fetch PM2 logs:", err);
      })
      .finally(() => {
        setIsRefreshingPm2(false);
      });
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Terminal & System Logs</h2>
          <p className="admin-page-subtitle">Sandbox scrape tester, User-Agent injector, and PM2 server system stdout console</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="terminal-tabs-row">
        <button 
          className={`terminal-tab-btn ${activeTab === "scraper" ? "active" : ""}`}
          onClick={() => setActiveTab("scraper")}
        >
          <ComputerTerminal01Icon size={16} />
          <span>Scraper Sandbox Terminal</span>
        </button>
        <button 
          className={`terminal-tab-btn ${activeTab === "pm2" ? "active" : ""}`}
          onClick={() => setActiveTab("pm2")}
        >
          <RefreshIcon size={16} className={isRefreshingPm2 ? "spin" : ""} />
          <span>PM2 Server Logs</span>
        </button>
      </div>

      {/* Viewport */}
      <div className="terminal-viewport-wrapper">
        {activeTab === "scraper" && (
          <div className="logs-tab-content">
            <div className="terminal-tester-panel">
              <div className="tester-form-col">
                <h3 className="section-title">Link Sandbox Tester</h3>
                <p className="section-desc">Run extraction algorithms in a test sandbox and monitor terminal response logs.</p>
                
                <form onSubmit={handleRunScraperTest} className="terminal-tester-form">
                  <input
                    type="url"
                    className="terminal-tester-input"
                    placeholder="Enter test video URL (e.g. https://youtu.be/...)"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    disabled={isRunningTest}
                    required
                  />
                  <button type="submit" className="admin-btn-primary" disabled={isRunningTest || !testUrl.trim()}>
                    <PlayIcon size={16} />
                    <span>{isRunningTest ? "Running..." : "Test Extract"}</span>
                  </button>
                </form>
              </div>

              {/* Console Screen */}
              <div className="terminal-console-screen">
                <div className="console-header">
                  <span className="console-dot red"></span>
                  <span className="console-dot yellow"></span>
                  <span className="console-dot green"></span>
                  <span className="console-title">scraper-sandbox-events.log</span>
                </div>
                <div className="console-body">
                  {terminalLogs.map((log, index) => (
                    <div key={index} className={`console-line ${log.includes("[ERROR]") ? "error" : log.includes("[SUCCESS]") ? "success" : ""}`}>
                      {log}
                    </div>
                  ))}
                  {terminalLogs.length === 0 && (
                    <div className="console-placeholder">
                      Console idle. Paste a URL and click "Test Extract" to begin.
                    </div>
                  )}
                  {isRunningTest && <div className="console-cursor"></div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "pm2" && (
          <div className="logs-tab-content">
            <div className="pm2-logs-panel">
              <div className="pm2-header-row">
                <div>
                  <h3 className="section-title">Rust Axum PM2 Server Output</h3>
                  <p className="section-desc">Monitor live system calls, HTTP endpoints, thread allocation logs, and errors.</p>
                </div>
                <button className="admin-btn-secondary" onClick={handleRefreshPm2Logs} disabled={isRefreshingPm2}>
                  <RefreshIcon size={16} className={isRefreshingPm2 ? "spin" : ""} />
                  <span>Refresh PM2 Logs</span>
                </button>
              </div>

              <div className="console-screen-dark">
                <div className="console-header">
                  <span className="console-dot red"></span>
                  <span className="console-dot yellow"></span>
                  <span className="console-dot green"></span>
                  <span className="console-title">pm2-system-stdout.log</span>
                </div>
                <div className="console-body pm2-console">
                  {pm2Logs.map((log, index) => (
                    <div key={index} className="pm2-log-line">
                      <span className="pm2-timestamp">{log.substring(0, 14)}</span>
                      <span className="pm2-text">{log.substring(14)}</span>
                    </div>
                  ))}
                  {isRefreshingPm2 && <div className="pm2-log-line loading-indicator">&bull; Loading server connections...</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
