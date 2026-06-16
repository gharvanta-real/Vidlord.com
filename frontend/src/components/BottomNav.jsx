import React from "react";
import { Home01Icon, Clock01Icon, Share01Icon, Download01Icon } from "hugeicons-react";
import "./BottomNav.css";

const fallbackCopyToClipboard = (text) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert("Vidlord link copied to clipboard!");
      });
      return;
    }
  } catch (e) {}

  // Native textarea selector fallback for HTTP local network testing IPs
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) {
      alert("Vidlord link copied to clipboard!");
    } else {
      prompt("Copy this link to share Vidlord:", text);
    }
  } catch (err) {
    prompt("Copy this link to share Vidlord:", text);
  }
};

export default function BottomNav({ activeTab, setActiveTab, deferredPrompt, onInstall, view, onNavigateHome, onNavigateHistory }) {
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "home") {
      onNavigateHome();
    } else if (tabId === "history") {
      onNavigateHistory();
    } else if (tabId === "action") {
      if (deferredPrompt) {
        onInstall();
      } else {
        // Fallback to share
        if (navigator.share) {
          navigator.share({
            title: 'Vidlord Downloader',
            text: 'Download high-quality YouTube, Instagram Reels & TikTok videos instantly!',
            url: window.location.origin
          }).catch(err => console.warn(err));
        } else {
          fallbackCopyToClipboard(window.location.origin);
        }
      }
    }
  };

  return (
    <div className="bottom-nav">
      <button 
        className={`bottom-nav-item ${(activeTab === "home" && view === "input") ? "active" : ""}`}
        onClick={() => handleTabClick("home")}
      >
        <Home01Icon size={24} />
        <span>Home</span>
      </button>

      <button 
        className={`bottom-nav-item ${(activeTab === "history" || view === "history") ? "active" : ""}`}
        onClick={() => handleTabClick("history")}
      >
        <Clock01Icon size={24} />
        <span>History</span>
      </button>

      <button 
        className="bottom-nav-item bottom-nav-action-btn"
        onClick={() => handleTabClick("action")}
      >
        {deferredPrompt ? <Download01Icon size={24} /> : <Share01Icon size={24} />}
        <span>{deferredPrompt ? "Install" : "Share"}</span>
      </button>
    </div>
  );
}
