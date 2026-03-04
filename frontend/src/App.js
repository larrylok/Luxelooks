import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";

// Storefront pages
import Home from "@/pages/Home";
import ProductDetail from "@/pages/ProductDetail";
import Checkout from "@/pages/Checkout";
import Wishlist from "@/pages/Wishlist";
import Comparison from "@/pages/Comparison";
import TrackOrder from "@/pages/TrackOrder";

// Footer pages (Customer Service + Legal)
import Shipping from "@/pages/Shipping";
import Returns from "@/pages/Returns";
import SizeGuide from "@/pages/SizeGuide";
import Care from "@/pages/Care";
import FAQs from "@/pages/FAQs";
import Privacy from "@/pages/legal/Privacy";
import Terms from "@/pages/legal/Terms";

// Admin pages
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminOrderDetail from "@/pages/admin/AdminOrderDetail";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import AdminReviews from "@/pages/admin/AdminReviews";
import AdminCollections from "@/pages/admin/AdminCollections";
import AdminReports from "@/pages/admin/AdminReports";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminNotifications from "@/pages/admin/AdminNotifications";
import AdminSecurity from "@/pages/admin/AdminSecurity";

// Layouts
import StorefrontLayout from "@/layouts/StorefrontLayout";
import AdminLayout from "@/layouts/AdminLayout";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          {/* Storefront routes */}
          <Route path="/" element={<StorefrontLayout />}>
            <Route index element={<Home />} />
            <Route path="products/:slug" element={<ProductDetail />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="track-order" element={<TrackOrder />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="comparison" element={<Comparison />} />

            {/* Footer routes */}
            <Route path="shipping" element={<Shipping />} />
            <Route path="returns" element={<Returns />} />
            <Route path="size-guide" element={<SizeGuide />} />
            <Route path="care" element={<Care />} />
            <Route path="faqs" element={<FAQs />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />

            {/* Fallback for unknown storefront routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:orderId" element={<AdminOrderDetail />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="collections" element={<AdminCollections />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="security" element={<AdminSecurity />} />
            <Route path="notifications" element={<AdminNotifications />} />

            {/* Fallback for unknown admin routes */}
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>

          {/* Global fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster position="top-right" />
    </div>
  );
}

export default App;