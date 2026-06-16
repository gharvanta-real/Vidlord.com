import React, { useState, useEffect } from "react";
import "./SponsorCard.css";

const API_BASE = import.meta.env.DEV 
  ? `http://${window.location.hostname}:8080` 
  : "";

export default function SponsorCard({ adCount, onAdClick }) {
  const [sponsors, setSponsors] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/ads_config.json`)
      .then((res) => res.json())
      .then((data) => setSponsors(data))
      .catch((err) => console.error("Failed to load ads config:", err));
  }, []);

  if (adCount >= 3 || sponsors.length === 0) return null;

  const sponsor = sponsors[adCount % sponsors.length];

  return (
    <div className="sc-wrapper" style={{ "--sponsor-accent": sponsor.accent }}>
      <div className="sc-header">
        <span className="sc-badge">{sponsor.badge}</span>
        <span className="sc-views-left">Sponsor Segment {adCount + 1}/3</span>
      </div>
      <a 
        href={sponsor.link} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="sc-banner-link"
        onClick={() => onAdClick(sponsor)}
      >
        <img 
          src={sponsor.image} 
          alt={sponsor.badge} 
          className="sc-banner-img" 
        />
      </a>
    </div>
  );
}
