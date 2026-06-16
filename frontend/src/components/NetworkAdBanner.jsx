import React, { useState, useEffect, useRef } from "react";
import "./NetworkAdBanner.css";

export default function NetworkAdBanner({ format }) {
  const [adKey, setAdKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFormat, setActiveFormat] = useState(format);
  const containerRef = useRef(null);

  useEffect(() => {
    // Determine the actual format if "responsive" is selected
    let targetFormat = format;
    if (format === "responsive") {
      const isMobile = window.innerWidth < 768;
      targetFormat = isMobile ? "468x60" : "728x90";
    }
    setActiveFormat(targetFormat);

    // Fetch the keys from config
    fetch("/network_ads.json")
      .then((res) => res.json())
      .then((data) => {
        let key = "";
        if (targetFormat === "728x90") {
          key = data.banner_728x90_key;
        } else if (targetFormat === "468x60") {
          key = data.banner_468x60_key;
        } else if (targetFormat === "300x250") {
          key = data.banner_300x250_key;
        }
        setAdKey(key && key.trim() !== "" ? key.trim() : null);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load network ads config:", err);
        setLoading(false);
      });
  }, [format]);

  useEffect(() => {
    if (loading || !adKey || !containerRef.current) return;

    // Clear any previous ad content
    containerRef.current.innerHTML = "";

    // Create wrapper container for Adsterra
    const adContainer = document.createElement("div");
    adContainer.id = `container-${adKey}`;
    containerRef.current.appendChild(adContainer);

    // Set size parameters
    let height = 250;
    let width = 300;
    if (activeFormat === "728x90") {
      height = 90;
      width = 728;
    } else if (activeFormat === "468x60") {
      height = 60;
      width = 468;
    }

    // Inject Adsterra options globally
    window.atOptions = window.atOptions || {};
    window.atOptions[adKey] = {
      key: adKey,
      format: "iframe",
      height: height,
      width: width,
      params: {},
    };

    // Create invoke script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `//www.highperformanceformat.com/${adKey}/invoke.js`;
    script.async = true;

    containerRef.current.appendChild(script);
  }, [adKey, loading, activeFormat]);

  if (loading) {
    return <div className="nab-loading-skeleton" />;
  }

  // Render a clean placeholder if no adKey is active yet
  if (!adKey) {
    let dimensions = "300 × 250";
    if (activeFormat === "728x90") dimensions = "728 × 90";
    if (activeFormat === "468x60") dimensions = "468 × 60";

    return (
      <div className={`nab-placeholder format-${activeFormat}`}>
        <span className="nab-tag">Display Ad Slot</span>
        <span className="nab-dimensions">{dimensions} Banner</span>
        <span className="nab-hint">Configure key in public/network_ads.json</span>
      </div>
    );
  }

  return <div className="nab-container" ref={containerRef} />;
}
