import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const API_URL = process.env.REACT_APP_BACKEND_URL?.replace(/\/$/, "") || "";

if (!API_URL) {
  console.warn(
    "REACT_APP_BACKEND_URL is not set. API calls may fail in production."
  );
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRetryEndpoint =
      originalRequest.url?.endsWith('/api/auth/refresh') ||
      originalRequest.url?.endsWith('/api/auth/login');

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isRetryEndpoint
    ) {
      originalRequest._retry = true;
      try {
        const refreshRes = await api.post('/api/auth/refresh');
        localStorage.setItem("token", refreshRes.data.token);
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("token");
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export { api };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.get("/api/auth/me");
        setUser(res.data);
      } catch (error) {
        console.error("Auth check failed:", error);
        setUser(null);
        try {
          await api.post("/api/auth/logout");
        } catch (clearError) {
          console.warn("Failed to clear invalid auth session:", clearError);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    const res = await api.post(`/api/auth/login`, {
      email,
      password,
    });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
  };

  const register = async (name, email, password) => {
    const res = await api.post(`/api/auth/register`, {
      name,
      email,
      password,
    });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (e) {
      // Background ping failure handled securely
    }
    localStorage.removeItem("token");
    setUser(null);
  };

  const googleLogin = async (credential) => {
    const res = await api.post(`/api/auth/google`, { credential });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "3px solid #e2e8f0", borderTopColor: "#16a34a", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
          <p style={{ color: "#64748b", fontSize: 14 }}>Loading...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, googleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};