const API_BASE = import.meta.env.DEV 
  ? `http://${window.location.hostname}:8080` 
  : "";

export function getApiBase() {
  return API_BASE;
}

export function adminFetch(endpoint, options = {}) {
  const token = localStorage.getItem("admin_token");
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
}
