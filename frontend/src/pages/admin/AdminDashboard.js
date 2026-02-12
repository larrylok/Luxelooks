import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  Eye,
} from "lucide-react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    lowStockProducts: 0,
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get orders
      const ordersResponse = await axios.get(`${API}/orders`, {
        params: { limit: 5 },
      });
      setRecentOrders(ordersResponse.data.orders || []);

      // Get products for low stock check
      const productsResponse = await axios.get(`${API}/products`, {
        params: { limit: 100 },
      });
      
      const products = productsResponse.data.products || [];
      
      // Calculate low stock products (total stock across all variants < 5)
      const lowStock = products.filter(product => {
        const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
        return totalStock < 5 && totalStock > 0;
      });
      setLowStockProducts(lowStock);

      // Get revenue report
      const revenueResponse = await axios.get(`${API}/reports/revenue`);
      
      // Calculate unique customers from orders
      const uniqueCustomers = new Set(
        ordersResponse.data.orders.map(o => o.customer.email)
      );

      setStats({
        totalRevenue: revenueResponse.data.totalRevenue || 0,
        totalOrders: revenueResponse.data.totalOrders || 0,
        totalCustomers: uniqueCustomers.size,
        lowStockProducts: lowStock.length,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
    setLoading(false);
  };

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
        <p className="text-graphite">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-card border border-gold/20 p-6" data-testid="stat-revenue">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gold/10 border border-gold flex items-center justify-center">
              <DollarSign size={24} className="text-gold" />
            </div>
            <span className="text-xs text-graphite tracking-widest uppercase">Revenue</span>
          </div>
          <div className="text-3xl font-serif text-charcoal mb-1">
            KES {stats.totalRevenue.toLocaleString()}
          </div>
          <p className="text-xs text-graphite">Total confirmed revenue</p>
        </div>

        <div className="bg-card border border-gold/20 p-6" data-testid="stat-orders">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gold/10 border border-gold flex items-center justify-center">
              <ShoppingCart size={24} className="text-gold" />
            </div>
            <span className="text-xs text-graphite tracking-widest uppercase">Orders</span>
          </div>
          <div className="text-3xl font-serif text-charcoal mb-1">
            {stats.totalOrders}
          </div>
          <p className="text-xs text-graphite">Total orders placed</p>
        </div>

        <div className="bg-card border border-gold/20 p-6" data-testid="stat-customers">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gold/10 border border-gold flex items-center justify-center">
              <Users size={24} className="text-gold" />
            </div>
            <span className="text-xs text-graphite tracking-widest uppercase">Customers</span>
          </div>
          <div className="text-3xl font-serif text-charcoal mb-1">
            {stats.totalCustomers}
          </div>
          <p className="text-xs text-graphite">Unique customers</p>
        </div>

        <div className="bg-card border border-gold/20 p-6" data-testid="stat-low-stock">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-destructive/10 border border-destructive flex items-center justify-center">
              <AlertTriangle size={24} className="text-destructive" />
            </div>
            <span className="text-xs text-graphite tracking-widest uppercase">Low Stock</span>
          </div>
          <div className="text-3xl font-serif text-charcoal mb-1">
            {stats.lowStockProducts}
          </div>
          <p className="text-xs text-graphite">Products need restock</p>
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
                {lowStockProducts.length} product{lowStockProducts.length !== 1 ? 's' : ''} running low on inventory
              </p>
              <div className="space-y-2">
                {lowStockProducts.slice(0, 5).map((product) => {
                  const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between bg-card p-3 border border-gold/20"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-12 h-12 object-cover"
                        />
                        <div>
                          <p className="text-sm font-bold text-charcoal">{product.name}</p>
                          <p className="text-xs text-graphite">{product.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-destructive">{totalStock} left</p>
                        <Link
                          to="/admin/products"
                          className="text-xs text-gold hover:underline"
                        >
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
              {recentOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/admin/orders/${order.id}`}
                  className="block p-4 border border-gold/20 hover:border-gold transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-charcoal">
                      {order.orderNumber}
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
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-graphite mb-2">{order.customer.name}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-graphite">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-sm font-bold text-gold">
                      KES {order.total.toLocaleString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-card border border-gold/20 p-6">
          <h2 className="font-serif text-2xl text-charcoal mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              to="/admin/products"
              className="p-6 border border-gold/20 hover:border-gold hover:bg-secondary transition-all text-center group"
            >
              <Package size={32} className="mx-auto text-gold mb-3" />
              <p className="text-sm font-bold tracking-widest uppercase">Products</p>
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
