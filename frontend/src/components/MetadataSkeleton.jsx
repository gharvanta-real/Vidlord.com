import React from "react";
import "./MetadataSkeleton.css";

export default function MetadataSkeleton({ onBack }) {
  return (
    <div className="ms-container">
      {/* 1. Header Metadata Card with video player skeleton */}
      <div className="ms-meta-card">
        <div className="ms-player-skeleton pulse" />
        <div className="ms-meta-details">
          <div className="ms-title-skeleton pulse" />
          <div className="ms-sub-skeleton pulse" />
        </div>
      </div>

      {/* 2. Simple Tabs Skeleton */}
      <div className="ms-tabs">
        <div className="ms-tab-skeleton pulse" />
        <div className="ms-tab-skeleton pulse" />
      </div>

      {/* 3. Formats List Skeleton */}
      <div className="ms-formats-list">
        <div className="ms-format-row-skeleton pulse" />
        <div className="ms-format-row-skeleton pulse" />
        <div className="ms-format-row-skeleton pulse" />
      </div>

      {/* 4. Cancel/Back Button */}
      <button onClick={onBack} className="ms-back-btn">
        Cancel
      </button>
    </div>
  );
}
