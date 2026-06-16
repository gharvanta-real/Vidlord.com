import React from "react";
import { ArrowLeft01Icon, Delete01Icon, Copy01Icon, Refresh01Icon, Video01Icon, Tick01Icon } from "hugeicons-react";
import "./HistoryView.css";

export default function HistoryView({ 
  history, 
  onBack, 
  onClear, 
  onDeleteItem, 
  onExtract,
  isSelectMode = false,
  selectedItems = new Set(),
  onToggleSelectItem
}) {
  const handleCopyLink = (linkText, e) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(linkText).then(() => {
          alert("Video link copied to clipboard!");
        });
        return;
      }
    } catch (e) {}
    
    // Textarea fallback for HTTP local network testing
    try {
      const textArea = document.createElement("textarea");
      textArea.value = linkText;
      textArea.style.position = "fixed";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert("Video link copied to clipboard!");
    } catch (err) {
      prompt("Copy video link:", linkText);
    }
  };

  const handleCardClick = (item, e) => {
    if (isSelectMode) {
      e.stopPropagation();
      onToggleSelectItem(item.id);
    } else {
      onExtract(item.originalUrl);
    }
  };

  return (
    <div className="hv-container">
      {/* 2. Main content area */}
      <div className="hv-content">
        {history.length > 0 ? (
          <div className="hv-list">
            {history.map((item) => (
              <div 
                key={item.id} 
                className={`hv-card ${isSelectMode ? "select-mode-active" : ""} ${isSelectMode && selectedItems.has(item.id) ? "card-selected" : ""}`} 
                onClick={(e) => handleCardClick(item, e)}
              >
                {isSelectMode && (
                  <div className={`hv-select-checkbox ${selectedItems.has(item.id) ? "checked" : ""}`}>
                    {selectedItems.has(item.id) && (
                      <Tick01Icon size={12} />
                    )}
                  </div>
                )}
                
                <div className="hv-thumbnail-wrapper">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="thumbnail" className="hv-thumbnail" />
                  ) : (
                    <div className="hv-thumbnail-fallback">
                      <Video01Icon size={22} />
                    </div>
                  )}
                  <span className="hv-badge-platform">{item.platform}</span>
                </div>
                
                <div className="hv-details">
                  <h3 className="hv-card-title">{item.title}</h3>
                  <div className="hv-meta">
                    <span className="hv-quality">{item.quality}</span>
                    <span className="hv-time">
                      {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {!isSelectMode && (
                  <div className="hv-actions">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onExtract(item.originalUrl); }}
                      className="hv-action-btn re-download" 
                      title="Download again"
                    >
                      <Refresh01Icon size={16} />
                    </button>
                    <button 
                      onClick={(e) => handleCopyLink(item.originalUrl, e)} 
                      className="hv-action-btn copy-link" 
                      title="Copy link"
                    >
                      <Copy01Icon size={16} />
                    </button>
                    <button 
                      onClick={(e) => onDeleteItem(item.id, e)} 
                      className="hv-action-btn delete-item" 
                      title="Delete item"
                    >
                      <Delete01Icon size={18} />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="hv-empty-state">
            <div className="hv-empty-glow"></div>
            <div className="hv-empty-icon">📂</div>
            <h2 className="hv-empty-title">Your Private Library</h2>
            <p className="hv-empty-text">Downloads you complete will appear here instantly.</p>
            <span className="hv-empty-subtext">All records are kept privately in this browser storage.</span>
          </div>
        )}
      </div>
    </div>
  );
}
