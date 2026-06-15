import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import DownloadInput from "./components/DownloadInput";
import MetadataView from "./components/MetadataView";
import ProgressView from "./components/ProgressView";
import Footer from "./components/Footer";
import DocModal from "./components/DocModal";
import "./App.css";

const API_BASE = import.meta.env.DEV ? "http://localhost:8080" : "";

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [view, setView] = useState("input"); // 'input' | 'selector' | 'downloading'
  const [isLoading, setIsLoading] = useState(false);
  const [videoData, setVideoData] = useState(null); // { info, formats }
  
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadStatus, setDownloadStatus] = useState(""); // 'downloading' | 'muxing' | 'completed' | 'error'
  const [downloadUrl, setDownloadUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [activeModal, setActiveModal] = useState(null); // 'privacy' | 'terms' | null
  const [extractionError, setExtractionError] = useState(""); // extraction error guide state

  const handleNavigateHowTo = (e) => {
    if (e) e.preventDefault();
    setView("input");
    setExtractionError("");
    setTimeout(() => {
      document.getElementById("how-to")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === "dark" ? "light" : "dark"));

  const handleExtract = async (url) => {
    setIsLoading(true);
    setExtractionError("");
    try {
      const response = await fetch(`${API_BASE}/api/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Metadata extraction failed");
      }
      const data = await response.json();
      setVideoData(data);
      setView("selector");
    } catch (err) {
      setExtractionError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFormat = (format, customTitle) => {
    setView("downloading");
    setDownloadStatus("downloading");
    setDownloadProgress(null);
    setErrorMsg("");

    const uniqueId = Date.now() + "_" + Math.floor(Math.random() * 1000);
    const ext = format.is_audio ? "m4a" : "mp4";
    
    const safeTitle = (customTitle || "vidlord")
      .trim()
      .replace(/[^a-zA-Z0-9_\-]/g, "_")
      .substring(0, 50);

    const fileName = `${safeTitle}_${uniqueId}.${ext}`;
    const outputPath = `./downloads/${fileName}`;

    let sseUrl = `${API_BASE}/api/download?url=${encodeURIComponent(format.download_url)}&output_path=${encodeURIComponent(outputPath)}`;
    if (format.audio_download_url) {
      sseUrl += `&audio_url=${encodeURIComponent(format.audio_download_url)}`;
    }

    const eventSource = new EventSource(sseUrl);
    const startTime = Date.now();

    eventSource.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.status === "downloading") {
        setDownloadStatus("downloading");
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0.1 ? msg.current / elapsed : 0;
        const eta = speed > 0 ? (msg.total - msg.current) / speed : 0;

        setDownloadProgress({
          percentage: msg.percentage,
          current: msg.current,
          total: msg.total,
          speed,
          eta,
        });
      } else if (msg.status === "muxing") {
        setDownloadStatus("muxing");
      } else if (msg.status === "completed") {
        setDownloadStatus("completed");
        setDownloadUrl(`${API_BASE}/downloads/${fileName}`);
        eventSource.close();
      } else if (msg.status === "error") {
        setDownloadStatus("error");
        setErrorMsg(msg.message || "Failed to download");
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setDownloadStatus("error");
      setErrorMsg("SSE stream connection lost.");
      eventSource.close();
    };
  };

  const handleReset = () => {
    setView("input");
    setVideoData(null);
    setDownloadProgress(null);
    setDownloadStatus("");
    setDownloadUrl("");
    setErrorMsg("");
  };

  return (
    <>
      <Navbar 
        theme={theme} 
        toggleTheme={toggleTheme} 
        onOpenPrivacy={() => setActiveModal("privacy")}
        onOpenTerms={() => setActiveModal("terms")}
        onNavigateHowTo={handleNavigateHowTo}
      />
      <main className="container">
        {view === "input" && (
          <div className="view-active">
            <DownloadInput 
              onExtract={handleExtract} 
              isLoading={isLoading} 
              error={extractionError}
              onClearError={() => setExtractionError("")}
            />
          </div>
        )}
        {view === "selector" && videoData && (
          <div className="view-active">
            <MetadataView
              info={videoData.info}
              formats={videoData.formats}
              onSelectFormat={handleSelectFormat}
              onBack={handleReset}
            />
          </div>
        )}
        {view === "downloading" && (
          <div className="view-active">
            <ProgressView
              progress={downloadProgress}
              status={downloadStatus}
              downloadUrl={downloadUrl}
              error={errorMsg}
              onReset={handleReset}
            />
          </div>
        )}
      </main>
      <Footer 
        theme={theme}
        onOpenPrivacy={() => setActiveModal("privacy")}
        onOpenTerms={() => setActiveModal("terms")}
      />
      <DocModal type={activeModal} onClose={() => setActiveModal(null)} />
    </>
  );
}
