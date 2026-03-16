import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  Tags,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../api";

function getId(obj) {
  return obj?._id || obj?.id || obj?.orderId || obj?.productId || "";
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
    totalCategories: 0,
    totalPages: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [
        ordersResponse,
        productsResponse,
        revenueResponse,
        categoriesResponse,
        pagesResponse,
      ] = await Promise.all([
        api.get(`/orders`, {
          params: { page: 1, limit: 20, includeArchived: true },
        }),
        api.get(`/products`, {
          params: { page: 1, limit: 100 },
        }),
        api.get(`/reports/revenue`),
        api.get(`/categories`),
        api.get(`/pages`),
      ]);

      const orders = Array.isArray(ordersResponse.data?.orders)
        ? ordersResponse.data.orders
        : [];

      const products = Array.isArray(productsResponse.data?.products)
        ? productsResponse.data.products
        : [];

      const categories = Array.isArray(categoriesResponse.data)
        ? categoriesResponse.data
        : Array.isArray(categoriesResponse.data?.items)
        ? categoriesResponse.data.items
        : [];

      const pages = Array.isArray(pagesResponse.data)
        ? pagesResponse.data
        : Array.isArray(pagesResponse.data?.items)
        ? pagesResponse.data.items
        : [];

      const recentNonArchived = orders.filter((o) => !o?.archived).slice(0, 5);
      setRecentOrders(recentNonArchived);

      const lowStock = products.filter((product) => {
        const variants = Array.isArray(product?.variants) ? product.variants : [];
        const totalStock = variants.reduce((sum, v) => sum + Number(v?.stock ?? 0), 0);
        return totalStock < 5 && totalStock > 0;
      });
      setLowStockProducts(lowStock);

      const uniqueCustomers = new Set(
        recentNonArchived
          .map((o) => (o?.customer?.email || "").trim().toLowerCase())
          .filter(Boolean)
      );

      setStats({
        totalRevenue: Number(revenueResponse.data?.totalRevenue ?? 0),
        totalOrders: Number(revenueResponse.data?.totalOrders ?? 0),
        totalCustomers: uniqueCustomers.size,
        lowStockProducts: lowStock.length,
        totalCategories: categories.length,
        totalPages: pages.length,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to load dashboard";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const lowStockTop = useMemo(() => lowStockProducts.slice(0, 5), [lowStockProducts]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-serif text-4xl text-charcoal mb-2">Dashboard</h1>
        <p className="text-graphite">
          Welcome back! Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-6 mb-12">
        <div className="bg-card border border-gold/20 p-6" data-testid="stat-revenue">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gold/10 border border-gold flex items-center justify-center">
              <DollarSign size={24} className="text-gold" />
            </div>
            <span className="text-xs text-graphite tracking-widest uppercase">
              Revenue
            </span>
          </div>
          <div className="text-3xl font-serif text-charcoal mb-1">
            KES {Number(stats.totalRevenue || 0).toLocaleString()}
          </div>
          <p className="text-xs text-graphite">Total confirmed revenue</p>
        </div>

        <div className="bg-card border border-gold/20 p-6" data-testid="stat-orders">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gold/10 border border-gold flex items-center justify-center">
              <ShoppingCart size={24} className="text-gold" />
            </div>
            <span className="text-xs text-graphite tracking-widest uppercase">
              Orders
            </span>
          </div>
          <div className="text-3xl font-serif text-charcoal mb-1">
            {Number(stats.totalOrders || 0).toLocaleString()}
          </div>
          <p className="text-xs text-graphite">Total orders placed</p>
        </div>

        <div className="bg-card border border-gold/20 p-6" data-testid="stat-customers">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gold/10 border border-gold flex items-center justify-center">
              <Users size={24} className="text-gold" />
            </div>
            <span className="text-xs text-graphite tracking-widest uppercase">
              Customers
            </span>
          </div>
          <div className="text-3xl font-serif text-charcoal mb-1">
            {Number(stats.totalCustomers || 0).toLocaleString()}
          </div>
          <p className="text-xs text-graphite">Unique customers (recent orders)</p>
        </div>

        <div className="bg-card border border-gold/20 p-6" data-testid="stat-low-stock">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-destructive/10 border border-destructive flex items-center justify-center">
              <AlertTriangle size={24} className="text-destructive" />
            </div>
            <span className="text-xs text-graphite tracking-widest uppercase">
              Low Stock
            </span>
          </div>
          <div className="text-3xl font-serif text-charcoal mb-1">
            {Number(stats.lowStockProducts || 0).toLocaleString()}
          </div>
          <p className="text-xs text-graphite">Products need restock</p>
        </div>

        <div className="bg-card border border-gold/20 p-6" data-testid="stat-categories">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gold/10 border border-gold flex items-center justify-center">
              <Tags size={24} className="text-gold" />
            </div>
            <span className="text-xs text-graphite tracking-widest uppercase">
              Categories
            </span>
          </div>
          <div className="text-3xl font-serif text-charcoal mb-1">
            {Number(stats.totalCategories || 0).toLocaleString()}
          </div>
          <p className="text-xs text-graphite">Storefront categories</p>
        </div>

        <div className="bg-card border border-gold/20 p-6" data-testid="stat-pages">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gold/10 border border-gold flex items-center justify-center">
              <FileText size={24} className="text-gold" />
            </div>
            <span className="text-xs text-graphite tracking-widest uppercase">
              Pages
            </span>
          </div>
          <div className="text-3xl font-serif text-charcoal mb-1">
            {Number(stats.totalPages || 0).toLocaleString()}
          </div>
          <p className="text-xs text-graphite">Custom storefront pages</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-destructive/5 border-l-4 border-destructive p-6 mb-8">
          <div className="flex items-start space-x-4">
            <AlertTriangle size={24} className="text-destructive flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-charcoal mb-2">Low Stock Alert</h3>
              <p className="text-sm text-graphite mb-4">
                {lowStockProducts.length} product
                {lowStockProducts.length !== 1 ? "s" : ""} running low on inventory
              </p>

              <div className="space-y-2">
                {lowStockTop.map((product) => {
                  const variants = Array.isArray(product?.variants) ? product.variants : [];
                  const totalStock = variants.reduce(
                    (sum, v) => sum + Number(v?.stock ?? 0),
                    0
                  );

                  const img =
                    product?.primaryImage ||
                    (Array.isArray(product?.images) && product.images.length
                      ? product.images[0]
                      : "");

                  return (
                    <div
                      key={getId(product) || product?.name}
                      className="flex items-center justify-between bg-card p-3 border border-gold/20"
                    >
                      <div className="flex items-center space-x-3">
                        {img ? (
                          <img
                            src={img}
                            alt={product.name}
                            className="w-12 h-12 object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 border border-gold/20 bg-black/5" />
                        )}

                        <div>
                          <p className="text-sm font-bold text-charcoal">{product.name}</p>
                          <p className="text-xs text-graphite">{product.category}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-destructive">
                          {totalStock} left
                        </p>
                        <Link to="/admin/products" className="text-xs text-gold hover:underline">
                          Manage
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Orders */}
        <div className="bg-card border border-gold/20 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-2xl text-charcoal">Recent Orders</h2>
            <Link
              to="/admin/orders"
              className="text-sm text-gold hover:underline tracking-widest uppercase"
            >
              View All
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="text-center py-8 text-graphite">No orders yet</p>
          ) : (
            <div className="space-y-4">
              {recentOrders.map((order) => {
                const oid = getId(order);
                return (
                  <Link
                    key={oid || order?.orderNumber || order?.createdAt}
                    to={`/admin/orders/${oid}`}
                    className="block p-4 border border-gold/20 hover:border-gold transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-charcoal">
                        {order.orderNumber || oid}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs tracking-widest uppercase ${
                          order.status === "pending"
                            ? "bg-secondary text-charcoal"
                            : order.status === "processing"
                            ? "bg-gold/20 text-gold"
                            : order.status === "shipped"
                            ? "bg-gold/10 text-charcoal"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {order.status || "unknown"}
                      </span>
                    </div>
                    <p className="text-sm text-graphite mb-2">
                      {order?.customer?.name || "—"}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-graphite">
                        {(order?.items?.length || 0)} item
                        {(order?.items?.length || 0) !== 1 ? "s" : ""}
                      </span>
                      <span className="text-sm font-bold text-gold">
                        KES {Number(order?.total || 0).toLocaleString()}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-gold/20 p-6">
          <h2 className="font-serif text-2xl text-charcoal mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Link
              to="/admin/products"
              className="p-6 border border-gold/20 hover:border-gold hover:bg-secondary transition-all text-center group"
            >
              <Package size={32} className="mx-auto text-gold mb-3" />
              <p className="text-sm font-bold tracking-widest uppercase">Products</p>
            </Link>

            <Link
              to="/admin/categories"
              className="p-6 border border-gold/20 hover:border-gold hover:bg-secondary transition-all text-center group"
            >
              <Tags size={32} className="mx-auto text-gold mb-3" />
              <p className="text-sm font-bold tracking-widest uppercase">Categories</p>
            </Link>

            <Link
              to="/admin/pages"
              className="p-6 border border-gold/20 hover:border-gold hover:bg-secondary transition-all text-center group"
            >
              <FileText size={32} className="mx-auto text-gold mb-3" />
              <p className="text-sm font-bold tracking-widest uppercase">Pages</p>
            </Link>

            <Link
              to="/admin/orders"
              className="p-6 border border-gold/20 hover:border-gold hover:bg-secondary transition-all text-center group"
            >
              <ShoppingCart size={32} className="mx-auto text-gold mb-3" />
              <p className="text-sm font-bold tracking-widest uppercase">Orders</p>
            </Link>

            <Link
              to="/admin/customers"
              className="p-6 border border-gold/20 hover:border-gold hover:bg-secondary transition-all text-center group"
            >
              <Users size={32} className="mx-auto text-gold mb-3" />
              <p className="text-sm font-bold tracking-widest uppercase">Customers</p>
            </Link>

            <Link
              to="/admin/reports"
              className="p-6 border border-gold/20 hover:border-gold hover:bg-secondary transition-all text-center group"
            >
              <TrendingUp size={32} className="mx-auto text-gold mb-3" />
              <p className="text-sm font-bold tracking-widest uppercase">Reports</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}