import React from "react";
import { Download01Icon, Refresh01Icon, AlertCircleIcon } from "hugeicons-react";
import "./ProgressView.css";

export default function ProgressView({ progress, status, downloadUrl, error, onReset }) {
  const isDownloading = status === "downloading";
  const isMuxing = status === "muxing";
  const isCompleted = status === "completed";
  const isError = status === "error";

  // Calculate percentages/bars
  const pct = progress ? progress.percentage : 0;
  const currentMb = progress ? (progress.current / (1024 * 1024)).toFixed(1) : "0.0";
  const totalMb = progress ? (progress.total / (1024 * 1024)).toFixed(1) : "0.0";

  return (
    <div className="pv-container">
      <div className="pv-progress-card">
        {/* Status Text Header */}
        <h3 className="pv-status-header">
          {isDownloading && "Downloading files..."}
          {isMuxing && "Muxing audio & video..."}
          {isCompleted && "Generation complete!"}
          {isError && "Something went wrong"}
        </h3>

        {/* Dynamic description info */}
        <p className="pv-status-desc">
          {isDownloading && `Received ${currentMb} MB of ${totalMb} MB`}
          {isMuxing && "Merging video and audio tracks natively (lossless)"}
          {isCompleted && "Your file is ready to save to your device"}
          {isError && (error || "Download failed. Please try again.")}
        </p>

        {/* Progress Bar (Only during downloading/muxing) */}
        {(isDownloading || isMuxing) && (
          <div className="pv-progress-bar-wrapper">
            <div 
              className="pv-progress-bar"
              style={{ 
                width: isMuxing ? "100%" : `${pct}%`,
                transition: "width 0.2s cubic-bezier(0.1, 0.8, 0.2, 1)"
              }} 
            />
          </div>
        )}

        {/* Speed & ETA display */}
        {isDownloading && progress && progress.speed > 0 && (
          <div className="pv-speed-eta-row">
            <span>
              {(progress.speed / (1024 * 1024)).toFixed(2)} MB/s ({((progress.speed * 8) / (1024 * 1024)).toFixed(1)} Mbps)
            </span>
            <span>
              {progress.eta < 60 
                ? `ETA: ${progress.eta.toFixed(0)}s` 
                : `ETA: ${Math.floor(progress.eta / 60)}m ${(progress.eta % 60).toFixed(0)}s`
              }
            </span>
          </div>
        )}

        {/* Error icon */}
        {isError && (
          <div className="pv-error-icon-wrapper">
            <AlertCircleIcon size={40} className="pv-error-icon" />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pv-actions">
        {isCompleted && downloadUrl && (
          downloadUrl === "streamed" ? (
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                borderRadius: '12px',
                fontWeight: '600',
                fontSize: '15px',
                width: '100%',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
              }}
            >
              Saved directly to Downloads!
            </div>
          ) : (
            <a href={downloadUrl} download className="pv-download-link">
              <button className="pv-download-btn">
                <Download01Icon size={20} />
                Save to Device
              </button>
            </a>
          )
        )}

        {(isDownloading || isMuxing) && (
          <button onClick={onReset} className="pv-cancel-btn">
            Cancel Download
          </button>
        )}

        {(isCompleted || isError) && (
          <button onClick={onReset} className="pv-reset-btn">
            <Refresh01Icon size={18} />
            Download Another
          </button>
        )}
      </div>

      {/* Privacy-First Sponsor Banner */}
      <div className="pv-ad-banner">
        <div className="pv-ad-tag">Sponsored</div>
        <p className="pv-ad-text">
          Support Vidlord: Get high-performance cloud servers from Hostlord starting at $2/mo.
        </p>
      </div>
    </div>
  );
}
