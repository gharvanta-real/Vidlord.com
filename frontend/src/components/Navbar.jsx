import React from "react";
import { Sun01Icon, Moon01Icon } from "hugeicons-react";
import "./Navbar.css";

export default function Navbar({ theme, toggleTheme, onOpenPrivacy, onOpenTerms, onNavigateHowTo, navigate, platform, view, onBack, onOpenMenu }) {
  const handleLogoClick = (e) => {
    if (view === "history") return;
    if (platform !== "generic") {
      navigate("/");
    } else {
      onNavigateHowTo(e);
    }
  };

  const isHistory = view === "history";

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left: Brand or Back + Title */}
        <div className="navbar-left-group">
          {isHistory && (
            <button onClick={onBack} className="navbar-back-btn" aria-label="Go back">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <div className="navbar-brand" onClick={handleLogoClick}>
            {isHistory ? (
              <span className="navbar-title">History</span>
            ) : (
              <>
                <img 
                  src="/logo-dark.png" 
                  alt="Logo" 
                  className="navbar-brand-logo logo-dark" 
                />
                <img 
                  src="/logo-light.png" 
                  alt="Logo" 
                  className="navbar-brand-logo logo-light" 
                />
              </>
            )}
          </div>
        </div>

        {/* Right Section: Navigation links + Theme Toggle */}
        <div className="navbar-actions">
          {!isHistory ? (
            <div className="nav-links">
              <a href="#how-to" className="nav-link" onClick={onNavigateHowTo}>How to</a>
              <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onOpenPrivacy(); }}>Privacy</a>
              <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onOpenTerms(); }}>Terms</a>
            </div>
          ) : (
            <button 
              onClick={onOpenMenu} 
              className="navbar-menu-btn"
              aria-label="History Options"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          )}

          {!isHistory && (
            <button 
              onClick={toggleTheme} 
              className="navbar-toggle-btn"
              aria-label="Toggle Theme"
            >
              {theme === "dark" ? (
                <Sun01Icon size={18} className="navbar-icon" />
              ) : (
                <Moon01Icon size={18} className="navbar-icon" />
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
