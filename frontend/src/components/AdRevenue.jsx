import React from "react";
import { Dollar01Icon, AlertCircleIcon, Award01Icon } from "hugeicons-react";
import "./AdRevenue.css";

export default function AdRevenue() {
  return (
    <div className="ar-container">
      <h2 className="ar-title">Sponsorships & Ad Model</h2>
      <p className="ar-subtitle">
        Vidlord is 100% free. To maintain our high-speed segment-muxing servers, we rely on a non-intrusive, privacy-respecting ad revenue framework.
      </p>

      <div className="ar-grid">
        <div className="ar-card">
          <AlertCircleIcon size={24} className="ar-icon" />
          <h3 className="ar-card-header">Privacy-First Ads</h3>
          <p className="ar-card-text">
            We do not use cookie-tracking ad networks. All promotions are static, self-hosted image ads with zero user profile tracking.
          </p>
        </div>

        <div className="ar-card">
          <Award01Icon size={24} className="ar-icon" />
          <h3 className="ar-card-header">Sponsor Chips</h3>
          <p className="ar-card-text">
            Partners can buy elegant logo chips in the supported section. A clean, borderless placement that respects the website layout.
          </p>
        </div>

        <div className="ar-card">
          <Dollar01Icon size={24} className="ar-icon" />
          <h3 className="ar-card-header">Speed Boosts</h3>
          <p className="ar-card-text">
            Watch a voluntary 5-second sponsored segment to unlock maximum download bandwidth (up to 100+ Mbps parallel threads).
          </p>
        </div>
      </div>
    </div>
  );
}
