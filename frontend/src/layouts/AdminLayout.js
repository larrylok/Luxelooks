import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

useEffect(() => {
  let cancelled = false;

  const verifyAuth = async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin/login", { replace: true });
      return;
    }

    // ✅ GLOBAL: every axios request now carries the admin token
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    try {
      // verify can still use params or just rely on the header
      await axios.get(`${API}/admin/verify`);

      if (!cancelled) setLoading(false);
    } catch (error) {
      localStorage.removeItem("admin_token");
      delete axios.defaults.headers.common["Authorization"];
      if (!cancelled) navigate("/admin/login", { replace: true });
    }
  };

  verifyAuth();

  return () => {
    cancelled = true;
  };
}, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl font-serif text-charcoal">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        <main className="flex-1 p-6 md:p-8 lg:p-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
