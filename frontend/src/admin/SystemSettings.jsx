import React, { useState, useEffect } from "react";
import { LockIcon, Shield01Icon, Tick01Icon, UserIcon } from "hugeicons-react";
import "./SystemSettings.css";
import { adminFetch } from "../services/adminApi";
import QRCode from "qrcode";

export default function SystemSettings() {
  const [config, setConfig] = useState(null);
  const [adminUsername, setAdminUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ipWhitelist, setIpWhitelist] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 2FA Setup state
  const [setupMode, setSetupMode] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [disableCode, setDisableCode] = useState("");

  const loadConfig = () => {
    adminFetch("/api/admin/config")
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setAdminUsername(data.admin_username);
        setIpWhitelist(data.ip_whitelist);
      })
      .catch(err => console.error("Failed to load security config:", err));
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (!config) return;

    if (newPassword !== confirmPassword) {
      alert("Error: New password and confirmation do not match.");
      return;
    }

    setIsLoading(true);
    adminFetch("/api/admin/change-password", {
      method: "POST",
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword
      })
    })
      .then(async (res) => {
        if (res.ok) {
          alert("Success! Your administrative password has been updated successfully.");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
        } else {
          const errData = await res.json().catch(() => ({}));
          alert("Error: " + (errData.message || "Failed to update password. Incorrect current password."));
        }
      })
      .catch(err => alert("Error: Network failure when updating password: " + err))
      .finally(() => setIsLoading(false));
  };

  const handleUpdateUsername = (e) => {
    e.preventDefault();
    if (!config) return;

    setIsLoading(true);
    const updatedConfig = { ...config, admin_username: adminUsername };
    
    adminFetch("/api/admin/config", {
      method: "POST",
      body: JSON.stringify(updatedConfig)
    })
      .then(res => {
        if (res.ok) {
          setConfig(updatedConfig);
          alert("Success! Admin username has been updated successfully.");
        } else {
          alert("Error: Failed to save updated username to server.");
        }
      })
      .catch(err => alert("Error: Network failure when updating username: " + err))
      .finally(() => setIsLoading(false));
  };

  const handleSaveWhitelist = () => {
    if (!config) return;
    setIsLoading(true);
    
    const updatedConfig = { ...config, ip_whitelist: ipWhitelist };
    
    adminFetch("/api/admin/config", {
      method: "POST",
      body: JSON.stringify(updatedConfig)
    })
      .then(res => {
        if (res.ok) {
          setConfig(updatedConfig);
          alert("IP Whitelist updated successfully! Restricted access configurations applied.");
        } else {
          alert("Error: Failed to save IP whitelist to server.");
        }
      })
      .catch(err => alert("Error: Network failure when saving whitelist: " + err))
      .finally(() => setIsLoading(false));
  };

  const handleStart2faSetup = () => {
    setIsLoading(true);
    adminFetch("/api/admin/2fa/setup", { method: "POST" })
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSetupSecret(data.secret);
          setSetupMode(true);
          QRCode.toDataURL(data.qr_uri, (err, url) => {
            if (err) console.error("Error generating QR:", err);
            setQrCodeUrl(url || "");
          });
        } else {
          alert("Error: Failed to initialize 2FA setup on server.");
        }
      })
      .catch(err => alert("Error: Failed to setup 2FA: " + err))
      .finally(() => setIsLoading(false));
  };

  const handleConfirm2faEnable = (e) => {
    e.preventDefault();
    if (!verificationCode) return;

    setIsLoading(true);
    adminFetch("/api/admin/2fa/enable", {
      method: "POST",
      body: JSON.stringify({
        secret: setupSecret,
        code: verificationCode
      })
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.status === "success") {
          alert("Success! Two-factor authentication (2FA) is now enabled for your account.");
          setSetupMode(false);
          setVerificationCode("");
          setSetupSecret("");
          setQrCodeUrl("");
          loadConfig();
        } else {
          alert("Error: " + (data.message || "Invalid verification code. Please try again."));
        }
      })
      .catch(err => alert("Error enabling 2FA: " + err))
      .finally(() => setIsLoading(false));
  };

  const handleDisable2fa = (e) => {
    e.preventDefault();
    if (!disablePassword || !disableCode) return;

    if (window.confirm("Are you sure you want to disable 2FA? This will make your account less secure.")) {
      setIsLoading(true);
      adminFetch("/api/admin/2fa/disable", {
        method: "POST",
        body: JSON.stringify({
          password: disablePassword,
          code: disableCode
        })
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (res.ok && data.status === "success") {
            alert("Success! Two-factor authentication (2FA) has been disabled.");
            setDisablePassword("");
            setDisableCode("");
            loadConfig();
          } else {
            alert("Error: " + (data.message || "Failed to disable 2FA. Verify your password and 2FA code."));
          }
        })
        .catch(err => alert("Error disabling 2FA: " + err))
        .finally(() => setIsLoading(false));
    }
  };

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-title">System & Vault Settings</h2>
          <p className="admin-page-subtitle">Configure administrative vault credentials, 2FA, and access control lists</p>
        </div>
      </div>

      <div className="settings-layout">
        <div className="settings-forms-col">
          {/* General Credentials (Username) */}
          <div className="settings-card">
            <h3 className="section-title">Admin Username</h3>
            <p className="section-desc">Change the username used to log in to this administrative console.</p>

            <form onSubmit={handleUpdateUsername} className="settings-form">
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Enter admin username"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  disabled={isLoading || !config}
                  required
                />
              </div>

              <button type="submit" className="admin-btn-primary" style={{ alignSelf: "flex-start", marginTop: "10px" }} disabled={isLoading || !config}>
                <UserIcon size={16} />
                <span>{isLoading ? "Saving..." : "Update Username"}</span>
              </button>
            </form>
          </div>

          {/* Password Vault */}
          <div className="settings-card">
            <h3 className="section-title">Update Security Password</h3>
            <p className="section-desc">Change the credentials used to log in to this administrative console.</p>

            <form onSubmit={handleUpdatePassword} className="settings-form">
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isLoading || !config}
                  required
                />
              </div>

              <div className="form-group-row">
                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading || !config}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading || !config}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="admin-btn-primary" style={{ alignSelf: "flex-start", marginTop: "10px" }} disabled={isLoading || !config}>
                <LockIcon size={16} />
                <span>{isLoading ? "Saving..." : "Update Password"}</span>
              </button>
            </form>
          </div>

          {/* Two-Factor Authentication (2FA) */}
          <div className="settings-card">
            <h3 className="section-title">Two-Factor Authentication (2FA)</h3>
            <p className="section-desc">Add an extra layer of security by requiring a verification code when signing in.</p>

            {config && (
              <div className="settings-form">
                {config.totp_enabled ? (
                  <div className="tfa-active-wrapper">
                    <div className="tfa-badge">
                      <Tick01Icon size={18} className="text-success" />
                      <span className="tfa-badge-text">Two-Factor Authentication is Enabled</span>
                    </div>

                    <div className="tfa-disable-form">
                      <h4 className="tfa-sub-title">Disable Two-Factor Authentication</h4>
                      <p className="section-desc">To disable 2FA, please verify your credentials.</p>

                      <form onSubmit={handleDisable2fa} className="settings-form">
                        <div className="form-group-row">
                          <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                              type="password"
                              className="form-input"
                              placeholder="Enter password"
                              value={disablePassword}
                              onChange={(e) => setDisablePassword(e.target.value)}
                              disabled={isLoading}
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">2FA Code</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="6-digit code"
                              maxLength={6}
                              value={disableCode}
                              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ""))}
                              disabled={isLoading}
                              required
                            />
                          </div>
                        </div>

                        <button type="submit" className="admin-btn-danger" style={{ alignSelf: "flex-start", marginTop: "10px" }} disabled={isLoading}>
                          <span>Disable 2FA</span>
                        </button>
                      </form>
                    </div>
                  </div>
                ) : !setupMode ? (
                  <div className="tfa-inactive-wrapper">
                    <p className="tfa-status-desc">Two-factor authentication is currently disabled. Scan a QR code using your Google Authenticator or custom app to configure.</p>
                    <button 
                      type="button" 
                      className="admin-btn-primary" 
                      onClick={handleStart2faSetup}
                      disabled={isLoading}
                    >
                      <Shield01Icon size={16} />
                      <span>Configure 2FA</span>
                    </button>
                  </div>
                ) : (
                  <div className="tfa-setup-wrapper fade-in">
                    <h4 className="tfa-sub-title">Configure Authenticator App</h4>
                    <p className="section-desc">Scan the QR code below using your authenticator app (Google Authenticator, Authy, Microsoft Authenticator) or enter the setup key manually.</p>

                    <div className="tfa-setup-layout">
                      {qrCodeUrl && (
                        <div className="tfa-qr-box">
                          <img src={qrCodeUrl} alt="Authenticator QR Code" className="tfa-qr-img" />
                        </div>
                      )}
                      
                      <div className="tfa-setup-details">
                        <div className="form-group">
                          <label className="form-label">Setup Key (Base32)</label>
                          <div className="tfa-key-display">{setupSecret}</div>
                        </div>

                        <form onSubmit={handleConfirm2faEnable} className="settings-form">
                          <div className="form-group">
                            <label className="form-label">Enter 6-Digit Verification Code</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="000 000"
                              maxLength={6}
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                              disabled={isLoading}
                              required
                            />
                          </div>

                          <div className="tfa-buttons-row">
                            <button type="submit" className="admin-btn-primary" disabled={isLoading}>
                              <span>Verify & Enable</span>
                            </button>
                            <button 
                              type="button" 
                              className="admin-btn-secondary" 
                              onClick={() => { setSetupMode(false); setVerificationCode(""); }}
                              disabled={isLoading}
                            >
                              <span>Cancel</span>
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* IP Whitelist */}
          <div className="settings-card">
            <h3 className="section-title">IP Access Control Whitelist</h3>
            <p className="section-desc">Restrict admin dashboard visibility to specific client IP addresses to prevent brute force attacks.</p>

            <div className="settings-form">
              <div className="form-group">
                <label className="form-label">Whitelisted IPs (One per line)</label>
                <textarea
                  className="settings-textarea"
                  rows="4"
                  value={ipWhitelist}
                  onChange={(e) => setIpWhitelist(e.target.value)}
                  disabled={isLoading || !config}
                ></textarea>
              </div>

              <button className="admin-btn-primary" onClick={handleSaveWhitelist} style={{ alignSelf: "flex-start", marginTop: "10px" }} disabled={isLoading || !config}>
                <Shield01Icon size={16} />
                <span>{isLoading ? "Saving..." : "Save Access Rules"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
