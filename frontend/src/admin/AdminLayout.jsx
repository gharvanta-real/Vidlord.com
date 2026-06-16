import React, { useState, useEffect } from "react";
import AdminLogin from "./AdminLogin";
import { adminFetch } from "../services/adminApi";
import DashboardOverview from "./DashboardOverview";
import ScraperHealth from "./ScraperHealth";
import MonetizationManager from "./MonetizationManager";
import CacheManager from "./CacheManager";
import SystemSettings from "./SystemSettings";
import CodeManager from "./CodeManager";
import TerminalLogs from "./TerminalLogs";
import { 
  DashboardSquare01Icon, 
  Settings02Icon, 
  Analytics02Icon, 
  Layers01Icon, 
  Folder01Icon, 
  Logout01Icon, 
  Sun01Icon, 
  Moon01Icon, 
  Notification01Icon,
  SourceCodeIcon,
  ComputerTerminal01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon
} from "hugeicons-react";
import "./AdminLayout.css";

export default function AdminLayout({ theme, toggleTheme, currentPath, navigate }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("admin_sidebar_collapsed") === "true";
  });
  
  const notifications = [
    { id: 1, text: "Google search sitemap indexed successfully", time: "1 hr ago" },
    { id: 2, text: "Bing Webmaster verification code matched", time: "2 hrs ago" },
    { id: 3, text: "TikTok crawler User-Agent updated", time: "4 hrs ago" }
  ];

  const normalizedPath = currentPath.startsWith("/admin") ? (currentPath.replace(/^\/admin/, "") || "/") : currentPath;

  const getAdminPath = (subpath) => {
    const isPathBased = currentPath.startsWith("/admin");
    if (isPathBased) {
      return subpath === "/" ? "/admin" : `/admin${subpath}`;
    }
    return subpath;
  };

  const isActive = (subpath) => {
    return normalizedPath === subpath;
  };

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("admin_sidebar_collapsed", next);
      return next;
    });
  };

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      // Force redirect to login subpath if unauthenticated
      if (normalizedPath !== "/login" && navigate) {
        const redirectPath = getAdminPath("/login");
        navigate(redirectPath);
      }
    }
  }, [currentPath, normalizedPath]);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    if (navigate) {
      const homePath = getAdminPath("/");
      navigate(homePath);
    }
  };

  const handleSignOut = () => {
    adminFetch("/api/admin/logout", { method: "POST" })
      .catch(err => console.error("Sign out failed on server:", err))
      .finally(() => {
        localStorage.removeItem("admin_token");
        setIsAuthenticated(false);
        if (navigate) {
          const loginPath = getAdminPath("/login");
          navigate(loginPath);
        }
      });
  };

  // If not authenticated, render login page shell
  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={handleLoginSuccess} />;
  }

  // Active page selector
  const renderActivePage = () => {
    switch (normalizedPath) {
      case "/scrapers":
        return <ScraperHealth />;
      case "/monetization":
        return <MonetizationManager />;
      case "/code":
        return <CodeManager />;
      case "/cache":
        return <CacheManager />;
      case "/logs":
        return <TerminalLogs />;
      case "/settings":
        return <SystemSettings />;
      case "/":
      default:
        return <DashboardOverview />;
    }
  };

  const getPageTitle = () => {
    switch (normalizedPath) {
      case "/scrapers":
        return "Scraper Health Room";
      case "/monetization":
        return "Ads & Monetization";
      case "/code":
        return "Script Injector";
      case "/cache":
        return "Cache & Storage";
      case "/logs":
        return "Terminal & Logs";
      case "/settings":
        return "System Vault";
      case "/":
      default:
        return "Admin Dashboard";
    }
  };

  const handleNavClick = (e, path) => {
    e.preventDefault();
    if (navigate) {
      navigate(path);
    }
  };

  const renderTabs = () => {
    const isScrapersGroup = normalizedPath === "/scrapers" || normalizedPath === "/logs";
    const isMonetizationGroup = normalizedPath === "/monetization" || normalizedPath === "/code";
    const isSystemGroup = normalizedPath === "/cache" || normalizedPath === "/settings";

    if (isScrapersGroup) {
      return (
        <div className="admin-page-tabs">
          <button 
            className={`admin-page-tab-btn ${normalizedPath === "/scrapers" ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, getAdminPath("/scrapers"))}
          >
            Health Monitor
          </button>
          <button 
            className={`admin-page-tab-btn ${normalizedPath === "/logs" ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, getAdminPath("/logs"))}
          >
            Console Logs
          </button>
        </div>
      );
    }

    if (isMonetizationGroup) {
      return (
        <div className="admin-page-tabs">
          <button 
            className={`admin-page-tab-btn ${normalizedPath === "/monetization" ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, getAdminPath("/monetization"))}
          >
            Sponsors Banner
          </button>
          <button 
            className={`admin-page-tab-btn ${normalizedPath === "/code" ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, getAdminPath("/code"))}
          >
            Script Injector
          </button>
        </div>
      );
    }

    if (isSystemGroup) {
      return (
        <div className="admin-page-tabs">
          <button 
            className={`admin-page-tab-btn ${normalizedPath === "/cache" ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, getAdminPath("/cache"))}
          >
            Cache & Storage
          </button>
          <button 
            className={`admin-page-tab-btn ${normalizedPath === "/settings" ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, getAdminPath("/settings"))}
          >
            Security Vault
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="admin-container">
      {/* 1. Left Sidebar Navigation */}
      <aside className={`admin-sidebar ${isCollapsed ? "collapsed" : ""}`}>
        {/* Sidebar Floating Toggle Button */}
        <button 
          className="sidebar-toggle-btn" 
          onClick={toggleSidebar} 
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ArrowRight01Icon size={14} /> : <ArrowLeft01Icon size={14} />}
        </button>

        <div className="admin-sidebar-logo-row">
          <div className="admin-sidebar-logo-circle">V</div>
          {!isCollapsed && <span className="admin-sidebar-logo-text">Vidlord Admin</span>}
        </div>

        <nav className="admin-sidebar-nav">
          <div className="sidebar-group-label">Manage</div>
          <a 
            href={getAdminPath("/")} 
            className={`admin-nav-item ${isActive("/") ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, getAdminPath("/"))}
            title={isCollapsed ? "Dashboard" : undefined}
          >
            <DashboardSquare01Icon size={18} />
            {!isCollapsed && <span>Dashboard</span>}
          </a>
          
          <a 
            href={getAdminPath("/scrapers")} 
            className={`admin-nav-item ${(normalizedPath === "/scrapers" || normalizedPath === "/logs") ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, getAdminPath("/scrapers"))}
            title={isCollapsed ? "Scraper Diagnostics" : undefined}
          >
            <Analytics02Icon size={18} />
            {!isCollapsed && <span>Scraper Room</span>}
          </a>

          <div className="sidebar-group-label">Monetization</div>
          <a 
            href={getAdminPath("/monetization")} 
            className={`admin-nav-item ${(normalizedPath === "/monetization" || normalizedPath === "/code") ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, getAdminPath("/monetization"))}
            title={isCollapsed ? "Monetization & Ads" : undefined}
          >
            <Layers01Icon size={18} />
            {!isCollapsed && <span>Monetization</span>}
          </a>

          <div className="sidebar-group-label">System</div>
          <a 
            href={getAdminPath("/cache")} 
            className={`admin-nav-item ${(normalizedPath === "/cache" || normalizedPath === "/settings") ? "active" : ""}`}
            onClick={(e) => handleNavClick(e, getAdminPath("/cache"))}
            title={isCollapsed ? "System Settings" : undefined}
          >
            <Settings02Icon size={18} />
            {!isCollapsed && <span>System Settings</span>}
          </a>
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-sidebar-logout-btn" onClick={handleSignOut} title="Sign Out">
            <Logout01Icon size={18} />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* 2. Topnav & Main Content Area */}
      <div className="admin-main-wrapper">
        <header className="admin-topnav">
          <h1 className="admin-topnav-title">{getPageTitle()}</h1>
          
          <div className="admin-topnav-actions">
            {/* Theme Toggle Button */}
            <button className="topnav-action-btn" onClick={toggleTheme} title="Toggle Theme">
              {theme === "light" ? <Moon01Icon size={20} /> : <Sun01Icon size={20} />}
            </button>

            {/* Notification Dropdown */}
            <div className="topnav-notification-wrapper">
              <button 
                className={`topnav-action-btn ${showNotificationMenu ? "active" : ""}`} 
                onClick={() => setShowNotificationMenu(!showNotificationMenu)}
                title="Notifications"
              >
                <Notification01Icon size={20} />
                <span className="notification-badge"></span>
              </button>

              {showNotificationMenu && (
                <>
                  <div className="notification-menu-overlay" onClick={() => setShowNotificationMenu(false)}></div>
                  <div className="notification-menu">
                    <div className="notification-menu-header">
                      <span>Notifications</span>
                    </div>
                    <div className="notification-list">
                      {notifications.map(n => (
                        <div key={n.id} className="notification-item">
                          <p className="notification-text">{n.text}</p>
                          <span className="notification-time">{n.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Avatar Badge */}
            <div className="admin-profile-badge">
              <div className="admin-profile-avatar">A</div>
              <span className="admin-profile-name">Administrator</span>
            </div>
          </div>
        </header>

        {/* 3. Sub-page viewport */}
        <main className="admin-viewport">
          {renderTabs()}
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}
