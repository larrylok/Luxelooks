import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Star,
  Folder,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const menuItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/products", label: "Products", icon: Package },
  { path: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { path: "/admin/customers", label: "Customers", icon: Users },
  { path: "/admin/reviews", label: "Reviews", icon: Star },
  { path: "/admin/collections", label: "Collections", icon: Folder },
  { path: "/admin/reports", label: "Reports", icon: BarChart3 },
  { path: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post(`${API}/admin/logout`);
      localStorage.removeItem("admin_token");
      toast.success("Logged out successfully");
      navigate("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
      localStorage.removeItem("admin_token");
      navigate("/admin/login");
    }
  };

  return (
    <aside className="w-72 min-h-screen bg-card border-r-2 border-gold/20 flex-shrink-0 flex flex-col">
      {/* Brand */}
      <div className="p-6 border-b border-gold/20">
        <div className="flex items-center gap-3">
          <div className="diamond-icon w-10 h-10 border-gold">
            <div className="w-4 h-4 bg-gold" />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-xl text-charcoal leading-tight">
              LUXE LOOKS
            </h2>
            <p className="text-[10px] tracking-[0.22em] uppercase text-graphite">
              Admin Panel
            </p>
          </div>
        </div>

        {/* Subtle Art Deco divider */}
        <div className="mt-5 h-[2px] w-full bg-gradient-to-r from-transparent via-gold/50 to-transparent" />
      </div>

      {/* Nav */}
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={[
                    "group relative flex items-center gap-3 px-4 py-3 border-l-4 transition-all",
                    isActive
                      ? "bg-secondary border-gold text-charcoal"
                      : "border-transparent text-graphite hover:text-charcoal hover:bg-secondary/60",
                  ].join(" ")}
                  data-testid={`admin-nav-${item.label.toLowerCase()}`}
                >
                  {/* Icon */}
                  <span
                    className={[
                      "p-2 border border-gold/20 bg-transparent transition-all",
                      isActive
                        ? "text-charcoal border-gold/40"
                        : "text-graphite group-hover:text-charcoal group-hover:border-gold/40",
                    ].join(" ")}
                  >
                    <Icon size={18} />
                  </span>

                  <span className="text-sm font-semibold tracking-wide">
                    {item.label}
                  </span>

                  {/* tiny gold corner accent */}
                  <span
                    className={[
                      "absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rotate-45 border border-gold/30",
                      isActive ? "bg-gold/30" : "bg-transparent group-hover:bg-gold/20",
                    ].join(" ")}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gold/20">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 border border-gold/20 hover:border-gold/50 hover:bg-secondary/60 text-graphite hover:text-charcoal transition-all"
          data-testid="admin-logout-button"
        >
          <span className="p-2 border border-gold/20">
            <LogOut size={18} />
          </span>
          <span className="text-sm font-semibold tracking-wide">Logout</span>
        </button>
      </div>
    </aside>
  );
}

