import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";

// Storefront pages
import Home from "@/pages/Home";
import ProductDetail from "@/pages/ProductDetail";
import Checkout from "@/pages/Checkout";
import Wishlist from "@/pages/Wishlist";
import Comparison from "@/pages/Comparison";

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
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="comparison" element={<Comparison />} />
          </Route>

          {/* Admin routes - temporarily disabled */}
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
          </Route> 
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
