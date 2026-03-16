import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import api, { getAdminToken, clearAdminToken } from "../api";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const logoutAndRedirect = () => {
      clearAdminToken();
      if (!cancelled) navigate("/admin/login", { replace: true });
    };

    const verifyAuth = async () => {
      const token = getAdminToken?.();
      if (!token) {
        logoutAndRedirect();
        return;
      }

      try {
        await api.get("/admin/verify");
        if (!cancelled) setLoading(false);
      } catch (error) {
        console.error("Admin verification failed:", error);
        logoutAndRedirect();
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