import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/admin/login`, { password });
      localStorage.setItem("admin_token", response.data.token);
      toast.success("Login successful");
      navigate("/admin");
    } catch (error) {
      toast.error("Invalid password");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="diamond-icon w-16 h-16 mx-auto mb-4">
            <div className="w-6 h-6 bg-gold"></div>
          </div>
          <h1 className="font-serif text-4xl tracking-tight text-charcoal mb-2">
            LUXE LOOKS
          </h1>
          <p className="text-sm tracking-widest uppercase text-graphite">Admin Panel</p>
        </div>

        <form onSubmit={handleLogin} className="bg-card border-2 border-gold/20 p-8">
          <div className="mb-6">
            <label className="block text-sm font-bold mb-3 tracking-widest uppercase text-charcoal">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
              required
              data-testid="admin-password-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold disabled:opacity-50"
            data-testid="admin-login-button"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="text-xs text-graphite text-center mt-6">
            Default password: luxelooks2026
          </p>
        </form>
      </div>
    </div>
  );
}
