import React from "react";
import { X } from "lucide-react";
import "./DocModal.css";

export default function DocModal({ type, onClose }) {
  if (!type) return null;

  const title = type === "privacy" ? "Privacy Policy" : "Terms of Service";
  
  return (
    <div className="dm-overlay" onClick={onClose}>
      <div className="dm-modal" onClick={e => e.stopPropagation()}>
        <div className="dm-header">
          <h3 className="dm-title">{title}</h3>
          <button onClick={onClose} className="dm-close-btn" aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        <div className="dm-content">
          {type === "privacy" ? (
            <>
              <p>Your privacy is extremely important to us. Vidlord operates under strict privacy principles:</p>
              <h4 className="dm-subheading">1. No Data Logging</h4>
              <p>We do not track, log, or store your IP address, download history, or extracted URLs. All processing is transient.</p>
              <h4 className="dm-subheading">2. In-Memory Processing</h4>
              <p>Video processing and stream muxing occur temporarily on the server, and files are automatically deleted after download.</p>
              <h4 className="dm-subheading">3. No Third-Party Analytics</h4>
              <p>We use no cookies, no tracking pixels, and no advertisement trackers.</p>
            </>
          ) : (
            <>
              <p>By using Vidlord, you agree to the following terms of service:</p>
              <h4 className="dm-subheading">1. Personal Use Only</h4>
              <p>This service is intended solely for personal, non-commercial use. Do not use this tool to infringe on intellectual property rights.</p>
              <h4 className="dm-subheading">2. Copyright Compliance</h4>
              <p>You are solely responsible for ensuring you have the legal right or permission from content owners to download media.</p>
              <h4 className="dm-subheading">3. Disclaimer of Warranty</h4>
              <p>Vidlord is provided "as is" without any warranties of any kind. We are not liable for any service interruptions or usage consequences.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
