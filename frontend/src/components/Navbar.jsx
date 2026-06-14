import React from "react";
import { Sun, Moon } from "lucide-react";
import "./Navbar.css";

export default function Navbar({ theme, toggleTheme, onOpenPrivacy, onOpenTerms, onNavigateHowTo }) {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left: Brand */}
        <div className="navbar-brand" onClick={onNavigateHowTo}>
          <span className="navbar-logo">Vidlord</span>
          <span className="navbar-subtitle">cli/web</span>
        </div>

        {/* Center: Navigation Links (Responsive, hidden on mobile) */}
        <div className="nav-links">
          <a href="#how-to" className="nav-link" onClick={onNavigateHowTo}>How to</a>
          <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onOpenPrivacy(); }}>Privacy</a>
          <a href="#" className="nav-link" onClick={(e) => { e.preventDefault(); onOpenTerms(); }}>Terms</a>
        </div>

        {/* Right: Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          className="navbar-toggle-btn"
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? (
            <Sun size={18} className="navbar-icon" />
          ) : (
            <Moon size={18} className="navbar-icon" />
          )}
        </button>
      </div>
    </nav>
  );
}
