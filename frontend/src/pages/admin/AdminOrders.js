import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Eye, Package, RefreshCw, Archive } from "lucide-react";
import { toast } from "sonner";
import api from "../../api";

function toNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function fmtKES(n) {
  const v = toNum(n, 0);
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `KES ${Math.round(v).toLocaleString()}`;
  }
}

function safeDate(s) {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function pick(obj, keys, fallback = "") {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

function normalizeOrder(o) {
  const id = o?.id || o?._id || o?.orderId || o?.order_id || "";
  const orderNumber = pick(o, ["orderNumber", "ref", "reference"], id || "—");

  const customer = o?.customer || o?.buyer || {};
  const customerName = pick(customer, ["name", "fullName"], "—");
  const customerEmail = pick(customer, ["email"], "—");
  const customerPhone = pick(customer, ["phone", "tel"], "—");

  const items = Array.isArray(o?.items)
    ? o.items
    : Array.isArray(o?.cartItems)
      ? o.cartItems
      : Array.isArray(o?.products)
        ? o.products
        : [];

  const total = toNum(pick(o, ["total", "grandTotal", "amountTotal"], 0), 0);
  const createdAt = pick(o, ["createdAt", "created_at"], null);

  const status = String(pick(o, ["status"], "pending")).toLowerCase();

  const payment = o?.payment || o?.mpesa || o?.transaction || {};
  const paymentMethod = pick(payment, ["method", "type"], pick(o, ["paymentMethod"], "—"));

  const archived = Boolean(o?.archived);

  return {
    raw: o,
    id,
    orderNumber,
    createdAt,
    status,
    customerName,
    customerEmail,
    customerPhone,
    itemsCount: items.length,
    total,
    paymentMethod,
    archived,
  };
}

function getStatusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "pending":
      return "bg-secondary text-charcoal";
    case "paid":
      return "bg-gold/10 text-charcoal";
    case "processing":
      return "bg-gold/20 text-gold";
    case "shipped":
      return "bg-gold/10 text-charcoal";
    case "delivered":
      return "bg-green-100 text-green-700";
    case "cancelled":
      return "bg-destructive/20 text-destructive";
    case "refunded":
      return "bg-secondary text-charcoal";
    default:
      return "bg-secondary text-charcoal";
  }
}

export default function AdminOrders() {
  const [ordersRaw, setOrdersRaw] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/orders", {
        params: { page: 1, limit: 100, includeArchived: showArchived },
      });
      const data = res.data || {};
      const list = Array.isArray(data.orders) ? data.orders : Array.isArray(data) ? data : [];
      setOrdersRaw(list);
    } catch (error) {
      console.error("Error loading orders:", error);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to load orders";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const orders = useMemo(() => ordersRaw.map(normalizeOrder).filter((o) => o.id), [ordersRaw]);

  const filteredOrders = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();

    return orders.filter((o) => {
      const matchesStatus = !filterStatus || o.status === filterStatus;
      if (!s) return matchesStatus;

      const hay = [
        o.orderNumber,
        o.customerName,
        o.customerEmail,
        o.customerPhone,
        o.status,
        o.archived ? "archived" : "",
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && hay.includes(s);
    });
  }, [orders, searchTerm, filterStatus]);

  const quickUpdateStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/${orderId}`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      await loadOrders();
    } catch (error) {
      console.error("Status update error:", error);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to update status";
      toast.error(msg);
    }
  };

  const toggleArchive = async (order) => {
    const id = order?.id;
    if (!id) return;

    try {
      if (order.archived) {
        await api.patch(`/orders/${id}/unarchive`);
        toast.success("Order unarchived");
      } else {
        await api.patch(`/orders/${id}/archive`);
        toast.success("Order archived");
      }
      await loadOrders();
    } catch (error) {
      console.error("Archive toggle error:", error);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to update archive status";
      toast.error(msg);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-serif text-4xl text-charcoal mb-2">Orders</h1>
          <p className="text-graphite">{orders.length} total orders</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs tracking-widest uppercase text-charcoal">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>

          <button
            onClick={loadOrders}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-card border border-gold/20 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-graphite"
              />
              <input
                type="text"
                placeholder="Search by order #, customer name, email, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-card border border-gold/20">
          <Package size={48} className="mx-auto text-gold/30 mb-4" />
          <p className="text-graphite">No orders found</p>
        </div>
      ) : (
        <div className="bg-card border border-gold/20 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-charcoal text-ivory">
              <tr>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Order #</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Customer</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Date</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Items</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Total</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Status</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className={`border-t border-gold/20 hover:bg-secondary/50 ${order.archived ? "opacity-60" : ""
                    }`}
                >
                  <td className="p-4">
                    <p className="font-bold text-charcoal">
                      {order.orderNumber}{" "}
                      {order.archived && (
                        <span className="ml-2 text-[10px] px-2 py-1 bg-secondary text-charcoal tracking-widest uppercase">
                          archived
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-graphite">{order.id}</p>
                  </td>

                  <td className="p-4">
                    <p className="text-sm font-bold">{order.customerName}</p>
                    <p className="text-xs text-graphite">{order.customerEmail}</p>
                    <p className="text-xs text-graphite">{order.customerPhone}</p>
                  </td>

                  <td className="p-4 text-sm">{safeDate(order.createdAt)}</td>

                  <td className="p-4 text-sm">{order.itemsCount} items</td>

                  <td className="p-4">
                    <p className="font-bold text-gold">{fmtKES(order.total)}</p>
                    <p className="text-xs text-graphite">{order.paymentMethod}</p>
                  </td>

                  <td className="p-4">
                    <span
                      className={`px-2 py-1 text-xs tracking-widest uppercase ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="p-2 hover:bg-secondary transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </Link>

                      {order.status === "pending" && !order.archived && (
                        <button
                          onClick={() => quickUpdateStatus(order.id, "processing")}
                          className="p-2 hover:bg-secondary transition-colors text-gold"
                          title="Mark as Processing"
                        >
                          <Package size={16} />
                        </button>
                      )}

                      <button
                        onClick={() => toggleArchive(order)}
                        className="p-2 hover:bg-secondary transition-colors"
                        title={order.archived ? "Unarchive" : "Archive"}
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
