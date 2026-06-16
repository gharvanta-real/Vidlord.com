import React, { useState, useEffect } from "react";
import { FloppyDiskIcon, AlertCircleIcon, Shield01Icon } from "hugeicons-react";
import "./CodeManager.css";
import { adminFetch } from "../services/adminApi";

export default function CodeManager() {
  const [config, setConfig] = useState(null);
  const [adSettings, setAdSettings] = useState({
    popunderEnabled: false,
    bannerEnabled: true,
    popunderScript: "",
    bannerScript: "",
    customHeaderScript: ""
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    adminFetch("/api/admin/config")
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setAdSettings({
          popunderEnabled: data.popunder_enabled,
          bannerEnabled: data.banner_enabled,
          popunderScript: data.popunder_script,
          bannerScript: data.banner_script,
          customHeaderScript: data.header_script
        });
      })
      .catch(err => console.error("Failed to load scripts config:", err));
  }, []);

  const handleSaveAdSettings = (e) => {
    e.preventDefault();
    if (!config) return;
    setIsLoading(true);

    const updatedConfig = {
      ...config,
      popunder_enabled: adSettings.popunderEnabled,
      banner_enabled: adSettings.bannerEnabled,
      popunder_script: adSettings.popunderScript,
      banner_script: adSettings.bannerScript,
      header_script: adSettings.customHeaderScript
    };

    adminFetch("/api/admin/config", {
      method: "POST",
      body: JSON.stringify(updatedConfig)
    })
      .then(res => {
        if (res.ok) {
          setConfig(updatedConfig);
          alert("Ad configuration codes injected successfully! Dynamic header tags applied.");
        } else {
          alert("Error: Failed to save script configurations to server.");
        }
      })
      .catch(err => alert("Error: Network failure updating scripts: " + err))
      .finally(() => setIsLoading(false));
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Code & Script Injector</h2>
          <p className="admin-page-subtitle">Inject external script tags, popunder codes, and HTML headers dynamically</p>
        </div>
      </div>

      <div className="code-injector-layout">
        <form onSubmit={handleSaveAdSettings} className="code-injector-form-wrapper">
          {/* Section 1: Header Injections */}
          <div className="code-settings-card">
            <div className="card-title-row">
              <Shield01Icon size={18} className="card-title-icon" />
              <h3 className="section-title">Custom Head HTML Injection</h3>
            </div>
            <p className="section-desc">Inject metadata, tracking pixels, or CSS stylesheets directly into the index head tag.</p>

            <div className="ad-script-group">
              <label className="ad-script-label">HTML Head Tags (e.g. meta, link, script)</label>
              <textarea
                className="ad-script-textarea code-font"
                rows="4"
                placeholder="<meta name='custom-tag' content='value' />"
                value={adSettings.customHeaderScript}
                onChange={(e) => setAdSettings({ ...adSettings, customHeaderScript: e.target.value })}
              ></textarea>
            </div>
          </div>

          {/* Section 2: Popunder Ad Settings */}
          <div className="code-settings-card">
            <div className="ad-toggle-row">
              <div>
                <h4 className="ad-toggle-title">Enable Popunder Script Code</h4>
                <p className="ad-toggle-desc">Trigger new popunder browser windows on download clicks</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={adSettings.popunderEnabled}
                  onChange={(e) => setAdSettings({ ...adSettings, popunderEnabled: e.target.checked })}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="ad-script-group">
              <label className="ad-script-label">Popunder Script Source / Tags</label>
              <textarea
                className="ad-script-textarea code-font"
                rows="5"
                placeholder="<!-- Paste Popunder script here -->"
                value={adSettings.popunderScript}
                onChange={(e) => setAdSettings({ ...adSettings, popunderScript: e.target.value })}
                disabled={!adSettings.popunderEnabled}
              ></textarea>
            </div>
          </div>

          {/* Section 3: Banner Ad Settings */}
          <div className="code-settings-card">
            <div className="ad-toggle-row">
              <div>
                <h4 className="ad-toggle-title">Enable Native Banner Ads</h4>
                <p className="ad-toggle-desc">Display banner card script placeholders inside client widgets</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={adSettings.bannerEnabled}
                  onChange={(e) => setAdSettings({ ...adSettings, bannerEnabled: e.target.checked })}
                />
                <span className="slider round"></span>
              </label>
            </div>

            <div className="ad-script-group">
              <label className="ad-script-label">Banner HTML / Script Source</label>
              <textarea
                className="ad-script-textarea code-font"
                rows="5"
                placeholder="<!-- Paste Banner ad code here -->"
                value={adSettings.bannerScript}
                onChange={(e) => setAdSettings({ ...adSettings, bannerScript: e.target.value })}
                disabled={!adSettings.bannerEnabled}
              ></textarea>
            </div>
          </div>

          {/* Submit Action */}
          <div className="code-actions-row">
            <button type="submit" className="admin-btn-primary" disabled={isLoading || !config}>
              <FloppyDiskIcon size={16} />
              <span>{isLoading ? "Saving Settings..." : "Save Code Configurations"}</span>
            </button>
            <div className="code-info-bubble">
              <AlertCircleIcon size={16} />
              <span>Injected codes are dynamically loaded on the client app window instance.</span>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
