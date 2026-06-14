import React from "react";
import { Link2, Sparkles, Download } from "lucide-react";
import "./Steps.css";

export default function Steps() {
  return (
    <div className="steps-container" id="how-to">
      <h2 className="steps-title">3 Easy Steps to Download</h2>
      <div className="steps-grid">
        <div className="step-card">
          <div className="step-num">01</div>
          <Link2 size={20} className="step-icon" />
          <h3 className="step-header">Paste Link</h3>
          <p className="step-text">Copy the video URL and paste it into the field above.</p>
        </div>
        <div className="step-card">
          <div className="step-num">02</div>
          <Sparkles size={20} className="step-icon" />
          <h3 className="step-header">Choose Format</h3>
          <p className="step-text">Select your target quality (e.g. 1080p HD, 720p, or M4A Audio).</p>
        </div>
        <div className="step-card">
          <div className="step-num">03</div>
          <Download size={20} className="step-icon" />
          <h3 className="step-header">Save File</h3>
          <p className="step-text">Click save to download the file directly to your device.</p>
        </div>
      </div>
    </div>
  );
}
