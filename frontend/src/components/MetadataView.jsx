import React, { useState } from "react";
import { PlayIcon, MusicNote01Icon, Video01Icon } from "hugeicons-react";
import VideoPlayer from "./VideoPlayer";
import NetworkAdBanner from "./NetworkAdBanner";
import "./MetadataView.css";

export default function MetadataView({ info, formats, onSelectFormat, onBack }) {
  const [activeTab, setActiveTab] = useState("video"); // 'video' or 'audio'
  const [editedTitle, setEditedTitle] = useState(info.title);

  const videoFormats = formats.filter(f => !f.is_audio);
  const audioFormats = formats.filter(f => f.is_audio);

  // Use the first video format stream URL as the playable preview, falling back to source_url
  const previewUrl = videoFormats.length > 0 ? videoFormats[0].download_url : info.source_url;

  return (
    <div className="mv-container">
      {/* 1. Header Metadata Card with video player and editable title */}
      <div className="mv-meta-card">
        <VideoPlayer url={previewUrl} poster={info.thumbnail_url} />
        <div className="mv-meta-details">
          <input
            type="text"
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="mv-title-input"
            placeholder="Customize download title..."
            style={{
              width: "100%",
              backgroundColor: "transparent",
              border: "none",
              color: "var(--text-main)",
              fontSize: "16px",
              fontWeight: 500,
              outline: "none",
              padding: "6px 0",
              borderBottom: "1px solid var(--bg-active)",
              fontFamily: "inherit",
            }}
          />
          <p className="mv-source">{info.platform} • {info.duration}</p>
        </div>
      </div>

      {/* 2. Simple Tabs */}
      <div className="mv-tabs">
        <button
          onClick={() => setActiveTab("video")}
          className={`mv-tab ${activeTab === "video" ? "active" : ""}`}
        >
          Video
        </button>
        <button
          onClick={() => setActiveTab("audio")}
          className={`mv-tab ${activeTab === "audio" ? "active" : ""}`}
        >
          Audio
        </button>
      </div>

      {/* 3. Formats List */}
      <div className="mv-formats-list">
        {activeTab === "video"
          ? videoFormats.map((f, i) => (
              <button
                key={i}
                onClick={() => onSelectFormat(f, editedTitle)}
                className="mv-format-row"
              >
                <div className="mv-format-info">
                  <Video01Icon size={18} className="mv-format-icon" />
                  <span className="mv-quality">{f.quality}</span>
                </div>
                <span className="mv-size">{f.size_mb > 0 ? `${f.size_mb} MB` : ""}</span>
              </button>
            ))
          : audioFormats.map((f, i) => (
              <button
                key={i}
                onClick={() => onSelectFormat(f, editedTitle)}
                className="mv-format-row"
              >
                <div className="mv-format-info">
                  <MusicNote01Icon size={18} className="mv-format-icon" />
                  <span className="mv-quality">{f.quality}</span>
                </div>
                <span className="mv-size">{f.size_mb > 0 ? `${f.size_mb} MB` : ""}</span>
              </button>
            ))}
      </div>

      {/* 4. Cancel/Back Button */}
      <button onClick={onBack} className="mv-back-btn">
        Cancel
      </button>

      {/* Ad Network Display Banner */}
      <NetworkAdBanner format="300x250" />
    </div>
  );
}
