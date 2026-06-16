import React, { useState, useEffect } from "react";
import { Add01Icon, Edit01Icon, Delete01Icon } from "hugeicons-react";
import "./MonetizationManager.css";
import { adminFetch } from "../services/adminApi";

export default function MonetizationManager() {
  const [config, setConfig] = useState(null);
  const [sponsors, setSponsors] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSponsor, setCurrentSponsor] = useState({ id: "", title: "", url: "", logo: "", clicks: 0 });

  useEffect(() => {
    adminFetch("/api/admin/config")
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setSponsors(data.sponsors || []);
      })
      .catch(err => console.error("Failed to load sponsors config:", err));
  }, []);

  const handleSaveSponsorsList = (updated) => {
    if (!config) return;
    setSponsors(updated);
    const updatedConfig = { ...config, sponsors: updated };
    
    adminFetch("/api/admin/config", {
      method: "POST",
      body: JSON.stringify(updatedConfig)
    })
      .then(res => {
        if (res.ok) {
          setConfig(updatedConfig);
        } else {
          alert("Error: Failed to save updated sponsors on server.");
        }
      })
      .catch(err => alert("Error: Network failure when saving sponsors: " + err));
  };

  const handleAddNewSponsor = () => {
    setCurrentSponsor({ id: "", title: "", url: "", logo: "", clicks: 0 });
    setIsEditing(true);
  };

  const handleEditSponsor = (sponsor) => {
    setCurrentSponsor(sponsor);
    setIsEditing(true);
  };

  const handleDeleteSponsor = (id) => {
    if (confirm("Are you sure you want to remove this sponsor card?")) {
      const updated = sponsors.filter(s => s.id !== id);
      handleSaveSponsorsList(updated);
    }
  };

  const handleSaveSponsorForm = (e) => {
    e.preventDefault();
    if (currentSponsor.id) {
      // Update existing
      const updated = sponsors.map(s => s.id === currentSponsor.id ? currentSponsor : s);
      handleSaveSponsorsList(updated);
    } else {
      // Insert new
      const newSponsor = {
        ...currentSponsor,
        id: Date.now().toString(),
        clicks: 0
      };
      handleSaveSponsorsList([...sponsors, newSponsor]);
    }
    setIsEditing(false);
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">Monetization & Ads Manager</h2>
          <p className="admin-page-subtitle">Configure native affiliate cards and sponsors visible on the main page</p>
        </div>
        <button className="admin-btn-primary" onClick={handleAddNewSponsor} disabled={!config}>
          <Add01Icon size={16} />
          <span>Add Sponsor</span>
        </button>
      </div>

      <div className="monetization-layout">
        <div className="sponsors-container">
          <h3 className="section-title">Active Homepage Sponsors</h3>
          <p className="section-desc">Manage the promotional banner cards displayed on the client application interface.</p>

          <div className="sponsors-list">
            {sponsors.map((s) => (
              <div key={s.id} className="sponsor-card-row">
                <div className="sponsor-logo-box">
                  <img src={s.logo} alt={s.title} className="sponsor-preview-img" onError={(e) => { e.target.src = "/logo-dark.png" }} />
                </div>
                <div className="sponsor-edit-details">
                  <span className="sponsor-edit-title">{s.title}</span>
                  <span className="sponsor-edit-meta">{s.url} &bull; {s.clicks} clicks</span>
                </div>
                <div className="sponsor-edit-actions">
                  <button className="btn-icon-edit" onClick={() => handleEditSponsor(s)}>
                    <Edit01Icon size={16} />
                  </button>
                  <button className="btn-icon-delete" onClick={() => handleDeleteSponsor(s.id)}>
                    <Delete01Icon size={16} />
                  </button>
                </div>
              </div>
            ))}
            {sponsors.length === 0 && (
              <div className="empty-state">No active sponsors. Click "Add Sponsor" to create one.</div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal Popup */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{currentSponsor.id ? "Edit Sponsor" : "Add Sponsor"}</h3>
              <button className="modal-close" onClick={() => setIsEditing(false)}>×</button>
            </div>
            <form onSubmit={handleSaveSponsorForm} className="modal-form">
              <div className="form-group">
                <label className="form-label">Sponsor Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. NordVPN Deal"
                  value={currentSponsor.title}
                  onChange={(e) => setCurrentSponsor({ ...currentSponsor, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Target Link (Affiliate URL)</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={currentSponsor.url}
                  onChange={(e) => setCurrentSponsor({ ...currentSponsor, url: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Banner Image File Path / URL</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. /nordvpn_banner.png"
                  value={currentSponsor.logo}
                  onChange={(e) => setCurrentSponsor({ ...currentSponsor, logo: e.target.value })}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
                <button type="submit" className="admin-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
