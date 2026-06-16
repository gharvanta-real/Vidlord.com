import React from "react";
import { Link01Icon, SparklesIcon, Download01Icon } from "hugeicons-react";
import "./Steps.css";

export default function Steps({ steps }) {
  // Safe fallback to generic steps if undefined
  const stepsList = steps || [
    { num: "01", title: "Paste Link", desc: "Copy the video URL and paste it into the field above.", iconType: "link" },
    { num: "02", title: "Choose Format", desc: "Select your target quality (e.g. 1080p HD, 720p, or M4A Audio).", iconType: "format" },
    { num: "03", title: "Save File", desc: "Click save to download the file directly to your device.", iconType: "download" }
  ];

  const renderIcon = (type) => {
    switch (type) {
      case "link":
        return <Link01Icon size={20} className="step-icon" />;
      case "format":
        return <SparklesIcon size={20} className="step-icon" />;
      case "download":
      default:
        return <Download01Icon size={20} className="step-icon" />;
    }
  };

  return (
    <div className="steps-container" id="how-to">
      <h2 className="steps-title">3 Easy Steps to Download</h2>
      <div className="steps-grid">
        {stepsList.map((step, index) => (
          <div key={index} className="step-card">
            <div className="step-num">{step.num}</div>
            <div className="step-card-header-row">
              <h3 className="step-header">{step.title}</h3>
              {renderIcon(step.iconType)}
            </div>
            <p className="step-text">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
