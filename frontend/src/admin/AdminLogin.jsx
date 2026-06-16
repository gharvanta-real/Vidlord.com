import React, { useState } from "react";
import { LockIcon, UserIcon, ArrowRight01Icon, AlertCircleIcon, Shield01Icon } from "hugeicons-react";
import "./AdminLogin.css";

const API_BASE = import.meta.env.DEV 
  ? `http://${window.location.hostname}:8080` 
  : "";

export default function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show2fa, setShow2fa] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const payload = { 
      username, 
      password: password || undefined 
    };
    if (show2fa) {
      payload.code = code;
    }

    fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          if (data.status === "success") {
            localStorage.setItem("admin_token", data.token);
            onLoginSuccess();
          } else if (data.status === "require_2fa") {
            setShow2fa(true);
            setError("");
            setIsLoading(false);
          } else {
            setError(data.message || "Invalid username or password");
            setIsLoading(false);
          }
        } else {
          setError(data.message || "Invalid credentials");
          setIsLoading(false);
        }
      })
      .catch((err) => {
        setError("Connection failed. Axum backend offline: " + err);
        setIsLoading(false);
      });
  };

  return (
    <div className="login-wrapper">
      <div className="login-glow"></div>
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-circle">
            <span className="login-logo-text">V</span>
          </div>
          <h1 className="login-title">Vidlord Vault</h1>
          <p className="login-subtitle">
            {show2fa ? "Two-Factor Authentication" : "Sign in to administrative console"}
          </p>
        </div>

        {error && (
          <div className="login-error-alert">
            <AlertCircleIcon size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {!show2fa ? (
            <>
              <div className="login-input-group">
                <label className="login-label">Username</label>
                <div className="login-input-wrapper">
                  <UserIcon size={18} className="login-input-icon" />
                  <input
                    type="text"
                    className="login-input"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="login-input-group">
                <label className="login-label">Password</label>
                <div className="login-input-wrapper">
                  <LockIcon size={18} className="login-input-icon" />
                  <input
                    type="password"
                    className="login-input"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="login-input-group fade-in">
              <label className="login-label">6-Digit Verification Code</label>
              <div className="login-input-wrapper">
                <Shield01Icon size={18} className="login-input-icon" />
                <input
                  type="text"
                  className="login-input"
                  placeholder="000 000"
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  disabled={isLoading}
                  required
                  autoFocus
                />
              </div>
              <p className="login-input-hint">Enter the code from your authenticator app.</p>
            </div>
          )}

          <button type="submit" className="login-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="login-spinner"></span>
            ) : (
              <>
                <span>{show2fa ? "Verify & Enter" : "Sign In"}</span>
                <ArrowRight01Icon size={18} />
              </>
            )}
          </button>
          
          {show2fa && (
            <button 
              type="button" 
              className="login-back-btn" 
              onClick={() => { setShow2fa(false); setCode(""); }}
              disabled={isLoading}
            >
              Back to Password
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
