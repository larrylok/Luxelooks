import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  RefreshCw,
  Save,
  Truck,
  CreditCard,
  User,
  MapPin,
  Package,
  FileText,
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function getAuthHeaders() {
  const token =
    localStorage.getItem("admin_token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

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
  return isNaN(d.getTime()) ? String(s) : d.toLocaleString();
}

function pick(obj, keys, fallback = undefined) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

async function tryUpdateOrder(orderId, payload) {
  // Try the most common endpoint patterns.
  const headers = { ...getAuthHeaders() };

  // 1) PUT /api/orders/:id
  try {
    const r = await axios.put(`${API}/orders/${orderId}`, payload, { headers });
    return r.data;
  } catch (e1) {
    // 2) PATCH /api/orders/:id
    try {
      const r = await axios.patch(`${API}/orders/${orderId}`, payload, { headers });
      return r.data;
    } catch (e2) {
      // 3) PUT /api/admin/orders/:id (some builds separate admin routes)
      try {
        const r = await axios.put(`${API}/admin/orders/${orderId}`, payload, { headers });
        return r.data;
      } catch (e3) {
        throw e1; // surface the original
      }
    }
  }
}

export default function AdminOrderDetail() {
  const { orderId } = useParams();
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [order, setOrder] = useState(null);

  // Editable admin fields
  const [status, setStatus] = useState("pending");
  const [tracking, setTracking] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const loadOrder = async () => {
    setLoading(true);
    try {
      // Most likely: GET /api/orders/:id
      const res = await axios.get(`${API}/orders/${orderId}`, {
        headers: { ...getAuthHeaders() },
      });

      const o = res.data?.order ?? res.data; // tolerate {order: {...}} or {...}
      setOrder(o);

      const st = (o?.status || "pending").toLowerCase();
      setStatus(st);

      setTracking(
        pick(o, ["trackingNumber", "tracking", "tracking_no", "tracking_code"], "") || ""
      );

      setAdminNote(pick(o, ["adminNote", "internalNote", "note", "notes"], "") || "");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load order";
      toast.error(msg);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const normalized = useMemo(() => {
    const o = order || {};
    const customer = o.customer || o.buyer || {};
    const shipping = o.shipping || o.delivery || o.shippingAddress || {};
    const payment = o.payment || o.mpesa || o.transaction || {};

    const items = Array.isArray(o.items)
      ? o.items
      : Array.isArray(o.cartItems)
        ? o.cartItems
        : Array.isArray(o.products)
          ? o.products
          : [];

    const subtotal =
      pick(o, ["subtotal", "subTotal", "itemsSubtotal"], null) ??
      items.reduce((acc, it) => acc + toNum(it?.price) * toNum(it?.qty ?? it?.quantity ?? 1, 1), 0);

    const shippingFee = pick(o, ["shippingFee", "shipping_fee", "deliveryFee", "delivery_fee"], 0);
    const discount = pick(o, ["discount", "discountAmount"], 0);
    const tax = pick(o, ["tax", "vat"], 0);

    const total = pick(o, ["total", "grandTotal", "amountTotal"], null) ??
      (toNum(subtotal) + toNum(shippingFee) + toNum(tax) - toNum(discount));

    return {
      id: o.id || o._id || orderId,
      orderNumber: o.orderNumber || o.ref || o.reference || o.id || orderId,
      createdAt: o.createdAt || o.created_at,
      updatedAt: o.updatedAt || o.updated_at,
      status: (o.status || "pending").toLowerCase(),
      customer,
      shipping,
      payment,
      items,
      money: { subtotal, shippingFee, discount, tax, total },
    };
  }, [order, orderId]);

  const saveChanges = async () => {
    if (!order) return;

    setSaving(true);
    try {
      const payload = {
        status,
        trackingNumber: tracking,
        adminNote,
      };

      const updated = await tryUpdateOrder(orderId, payload);

      // If backend returns updated order, refresh local state
      const o = updated?.order ?? updated;
      if (o) setOrder(o);

      toast.success("Order updated");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to update order";
      toast.error(msg);
    }
    setSaving(false);
  };

  const StatusPill = ({ value }) => (
    <span className="text-xs tracking-widest uppercase border border-gold/30 px-2 py-1 text-graphite">
      {String(value || "unknown")}
    </span>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => nav(-1)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gold/30 hover:border-gold text-xs tracking-widest uppercase bg-card"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <Link
              to="/admin/orders"
              className="inline-flex items-center gap-2 px-3 py-2 border border-gold/30 hover:border-gold text-xs tracking-widest uppercase bg-card"
            >
              Orders
            </Link>

            <button
              onClick={loadOrder}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gold/30 hover:border-gold text-xs tracking-widest uppercase bg-card"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <h1 className="font-serif text-4xl mt-4 truncate">
            Order {normalized.orderNumber}
          </h1>

          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <StatusPill value={normalized.status} />
            <p className="text-xs text-graphite">
              Created: <span className="font-semibold">{safeDate(normalized.createdAt)}</span>
            </p>
            <p className="text-xs text-graphite">
              Updated: <span className="font-semibold">{safeDate(normalized.updatedAt)}</span>
            </p>
          </div>
        </div>

        <button
          onClick={saveChanges}
          className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold disabled:opacity-50"
          disabled={saving || loading || !order}
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="bg-card border-2 border-gold/20 p-6 text-graphite">
          Loading order…
        </div>
      ) : !order ? (
        <div className="bg-card border-2 border-gold/20 p-6 text-graphite">
          Order not found or failed to load.
        </div>
      ) : (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left: Items + totals */}
          <div className="lg:col-span-7 space-y-6">
            <section className="bg-card border-2 border-gold/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-graphite" />
                <h2 className="font-serif text-2xl">Items</h2>
              </div>

              {normalized.items.length === 0 ? (
                <div className="border border-gold/20 p-4 text-graphite">
                  No items on this order.
                </div>
              ) : (
                <div className="overflow-auto border border-gold/20">
                  <table className="w-full text-left">
                    <thead className="bg-black/5">
                      <tr>
                        <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                          Product
                        </th>
                        <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                          Qty
                        </th>
                        <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                          Unit
                        </th>
                        <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalized.items.map((it, idx) => {
                        const name = it?.name || it?.title || it?.productName || "Item";
                        const qty = toNum(it?.qty ?? it?.quantity ?? 1, 1);
                        const unit = toNum(it?.price ?? it?.unitPrice ?? 0, 0);
                        const line = qty * unit;

                        return (
                          <tr key={it?.id || it?._id || it?.slug || idx} className="border-t border-gold/20">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {it?.image ? (
                                  <img
                                    src={it.image}
                                    alt={name}
                                    className="w-12 h-12 object-cover border border-gold/20"
                                  />
                                ) : (
                                  <div className="w-12 h-12 border border-gold/20 bg-black/5" />
                                )}
                                <div className="min-w-0">
                                  <p className="font-serif text-lg truncate">{name}</p>
                                  <p className="text-xs text-graphite truncate">
                                    {it?.sku ? `SKU: ${it.sku}` : it?.slug ? `/${it.slug}` : ""}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 font-semibold">{qty}</td>
                            <td className="p-3">{fmtKES(unit)}</td>
                            <td className="p-3 font-semibold">{fmtKES(line)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="bg-card border-2 border-gold/20 p-6">
              <h2 className="font-serif text-2xl mb-4">Totals</h2>

              <div className="space-y-3 border border-gold/20 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-graphite">Subtotal</span>
                  <span className="font-semibold">{fmtKES(normalized.money.subtotal)}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-graphite">Shipping</span>
                  <span className="font-semibold">{fmtKES(normalized.money.shippingFee)}</span>
                </div>

                {toNum(normalized.money.tax) !== 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-graphite">Tax</span>
                    <span className="font-semibold">{fmtKES(normalized.money.tax)}</span>
                  </div>
                ) : null}

                {toNum(normalized.money.discount) !== 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-graphite">Discount</span>
                    <span className="font-semibold">- {fmtKES(normalized.money.discount)}</span>
                  </div>
                ) : null}

                <div className="border-t border-gold/20 pt-3 flex items-center justify-between">
                  <span className="text-xs tracking-widest uppercase font-bold text-graphite">
                    Total
                  </span>
                  <span className="font-serif text-2xl">{fmtKES(normalized.money.total)}</span>
                </div>
              </div>
            </section>
          </div>

          {/* Right: Customer, shipping, payment, admin controls */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-card border-2 border-gold/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-graphite" />
                <h2 className="font-serif text-2xl">Customer</h2>
              </div>

              <div className="border border-gold/20 p-4 space-y-2">
                <p className="font-serif text-xl">
                  {normalized.customer?.name || "—"}
                </p>
                <p className="text-sm text-graphite">
                  {normalized.customer?.email || "—"}
                </p>
                <p className="text-sm text-graphite">
                  {normalized.customer?.phone || "—"}
                </p>
              </div>
            </section>

            <section className="bg-card border-2 border-gold/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-graphite" />
                <h2 className="font-serif text-2xl">Shipping</h2>
              </div>

              <div className="border border-gold/20 p-4 space-y-1 text-sm">
                <p className="text-graphite">
                  Method:{" "}
                  <span className="font-semibold">
                    {pick(normalized.shipping, ["method", "shippingMethod", "deliveryMethod"], "—")}
                  </span>
                </p>
                <p className="text-graphite">
                  Location:{" "}
                  <span className="font-semibold">
                    {pick(normalized.shipping, ["address", "location", "area", "town"], "—")}
                  </span>
                </p>
                <p className="text-graphite">
                  Notes:{" "}
                  <span className="font-semibold">
                    {pick(normalized.shipping, ["notes", "instructions"], "—")}
                  </span>
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-graphite" />
                  <input
                    value={tracking}
                    onChange={(e) => setTracking(e.target.value)}
                    className="w-full px-3 py-2 border border-gold/20 focus:border-gold bg-transparent focus:outline-none font-serif"
                    placeholder="Tracking number (optional)"
                  />
                </div>
              </div>
            </section>

            <section className="bg-card border-2 border-gold/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-4 h-4 text-graphite" />
                <h2 className="font-serif text-2xl">Payment</h2>
              </div>

              <div className="border border-gold/20 p-4 space-y-1 text-sm">
                <p className="text-graphite">
                  Method:{" "}
                  <span className="font-semibold">
                    {pick(normalized.payment, ["method", "type"], pick(order, ["paymentMethod"], "—"))}
                  </span>
                </p>
                <p className="text-graphite">
                  Status:{" "}
                  <span className="font-semibold">
                    {pick(normalized.payment, ["status"], pick(order, ["paymentStatus"], "—"))}
                  </span>
                </p>
                <p className="text-graphite">
                  Reference:{" "}
                  <span className="font-semibold">
                    {pick(normalized.payment, ["reference", "receipt", "mpesaReceipt", "transactionId"], "—")}
                  </span>
                </p>
              </div>
            </section>

            <section className="bg-card border-2 border-gold/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-graphite" />
                <h2 className="font-serif text-2xl">Admin controls</h2>
              </div>

              <div className="border border-gold/20 p-4 space-y-4">
                <div>
                  <label className="block text-xs tracking-widest uppercase font-bold text-graphite mb-2">
                    Order status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-3 border border-gold/20 focus:border-gold bg-transparent font-serif"
                  >
                    <option value="pending">pending</option>
                    <option value="paid">paid</option>
                    <option value="processing">processing</option>
                    <option value="shipped">shipped</option>
                    <option value="delivered">delivered</option>
                    <option value="cancelled">cancelled</option>
                    <option value="refunded">refunded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs tracking-widest uppercase font-bold text-graphite mb-2">
                    Internal note
                  </label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    className="w-full px-3 py-3 border border-gold/20 focus:border-gold bg-transparent font-serif min-h-[110px]"
                    placeholder="Internal note (not shown to customer)…"
                  />
                </div>

                <button
                  onClick={saveChanges}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold disabled:opacity-50"
                  disabled={saving}
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

