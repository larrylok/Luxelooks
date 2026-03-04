import axios from "axios";

function getBackendUrl() {
  // Prefer env, fallback to same-origin (works after deployment)
  const env = process.env.REACT_APP_BACKEND_URL;

  if (env && typeof env === "string" && env.trim() && env !== "undefined") {
    return env.replace(/\/+$/, ""); // remove trailing slashes
  }

  // same-origin fallback (frontend and backend served together / proxied)
  return "";
}

const TOKEN_KEY = "admin_token";

// One-time migration so old builds keep working
function migrateAdminToken() {
  try {
    const existing = localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;

    const legacy =
      localStorage.getItem("adminToken") || localStorage.getItem("token");

    if (legacy) {
      localStorage.setItem(TOKEN_KEY, legacy);
      localStorage.removeItem("adminToken");
      localStorage.removeItem("token");
      return legacy;
    }

    return "";
  } catch {
    return "";
  }
}

export function getAdminToken() {
  // Always read from the canonical key after migration
  return migrateAdminToken() || "";
}

export function setAdminToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);

    // Clean legacy keys to prevent split-brain auth
    localStorage.removeItem("adminToken");
    localStorage.removeItem("token");
  } catch {
    // ignore storage errors
  }
}

export function clearAdminToken() {
  setAdminToken("");
}

const api = axios.create({
  baseURL: `${getBackendUrl()}/api`,
  withCredentials: false,
});

// Attach token automatically to every request
api.interceptors.request.use(
  (config) => {
    const token = getAdminToken();

    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Global auth failure handling: on 401 clear token and bounce to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    if (status === 401) {
      clearAdminToken();

      // Avoid redirect loops if already on login
      if (
        window.location.pathname.startsWith("/admin") &&
        !window.location.pathname.startsWith("/admin/login")
      ) {
        window.location.href = "/admin/login";
      }
    }

    return Promise.reject(err);
  }
);

export default api;

