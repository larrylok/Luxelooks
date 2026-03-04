import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "../../api";
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
  Clock,
  MessageSquareText,
  Archive,
} from "lucide-react";

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

function normalizeHistoryItem(h) {
  if (!h || typeof h !== "object") return null;
  const at = h.at || h.timestamp || h.time || h.createdAt || null;
  return {
    status: String(h.status || "").trim(),
    note: String(h.note || "").trim(),
    at,
  };
}

function defaultNoteForStatus(st) {
  switch (String(st || "").toLowerCase()) {
    case "paid":
      return "Payment confirmed.";
    case "processing":
      return "Order is being prepared.";
    case "shipped":
      return "Order has been dispatched.";
    case "delivered":
      return "Order delivered.";
    case "cancelled":
      return "Order cancelled.";
    case "refunded":
      return "Order refunded.";
    case "pending":
    default:
      return "Order updated.";
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

  // Customer-visible note that becomes part of statusHistory
  const [customerUpdateNote, setCustomerUpdateNote] = useState("");

  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/orders/${orderId}`);
      const o = res.data?.order ?? res.data;
      setOrder(o);

      setStatus(String(o?.status || "pending").toLowerCase());

      const t =
        pick(o?.delivery, ["trackingNumber"], "") ||
        pick(o, ["trackingUrl"], "") ||
        "";
      setTracking(String(t || ""));

      setAdminNote(pick(o, ["adminNotes", "adminNote", "notes", "note"], "") || "");

      // reset customer note each load
      setCustomerUpdateNote("");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load order";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const normalized = useMemo(() => {
    const o = order || {};
    const customer = o.customer || o.buyer || {};
    const shipping = o.delivery || o.shipping || o.shippingAddress || {};
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
      items.reduce(
        (acc, it) =>
          acc + toNum(it?.price) * toNum(it?.qty ?? it?.quantity ?? 1, 1),
        0
      );

    const shippingFee = pick(o, ["shippingCost", "shippingFee", "deliveryFee"], 0);
    const discount = pick(o, ["discount", "discountAmount"], 0);
    const tax = pick(o, ["tax", "vat"], 0);

    const total =
      pick(o, ["total", "grandTotal", "amountTotal"], null) ??
      (toNum(subtotal) + toNum(shippingFee) + toNum(tax) - toNum(discount));

    const rawHist = Array.isArray(o.statusHistory) ? o.statusHistory : [];
    const history = rawHist
      .map(normalizeHistoryItem)
      .filter(Boolean)
      .sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));

    const id = o.id || o._id || orderId;
    const archived = Boolean(o.archived);

    return {
      id,
      archived,
      orderNumber: o.orderNumber || o.ref || o.reference || o.id || orderId,
      createdAt: o.createdAt || o.created_at,
      updatedAt: o.updatedAt || o.updated_at,
      status: String(o.status || "pending").toLowerCase(),
      customer,
      shipping,
      payment,
      items,
      history,
      money: { subtotal, shippingFee, discount, tax, total },
    };
  }, [order, orderId]);

  const saveChanges = async () => {
    if (!order) return;

    const prevStatus = String(order?.status || "pending").toLowerCase();
    const nextStatus = String(status || "pending").toLowerCase();

    const prevTracking =
      pick(order?.delivery, ["trackingNumber"], "") ||
      pick(order, ["trackingUrl"], "") ||
      "";
    const nextTracking = String(tracking || "").trim();

    const existingHistory = Array.isArray(order.statusHistory) ? order.statusHistory : [];
    const newHistory = existingHistory.slice();

    const nowIso = new Date().toISOString();
    const customerNote = String(customerUpdateNote || "").trim();

    // Append history if status changed
    if (prevStatus !== nextStatus) {
      newHistory.push({
        status: nextStatus,
        note: customerNote || defaultNoteForStatus(nextStatus),
        at: nowIso,
        timestamp: nowIso, // backward compat
      });
    } else {
      const changedTracking = String(prevTracking || "").trim() !== nextTracking;
      if (changedTracking && nextTracking) {
        newHistory.push({
          status: nextStatus || prevStatus,
          note: customerNote || "Tracking information updated.",
          at: nowIso,
          timestamp: nowIso,
        });
      } else if (customerNote) {
        newHistory.push({
          status: nextStatus || prevStatus,
          note: customerNote,
          at: nowIso,
          timestamp: nowIso,
        });
      }
    }

    setSaving(true);
    try {
      const payload = {
        status: nextStatus,
        adminNotes: adminNote,
        delivery: {
          ...(order.delivery || {}),
          trackingNumber: nextTracking ? nextTracking : null,
        },
        trackingUrl: nextTracking ? nextTracking : null,
        statusHistory: newHistory,
      };

      await api.put(`/orders/${orderId}`, payload);

      toast.success("Order updated");
      await loadOrder();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to update order";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async () => {
    if (!normalized?.id) return;
    try {
      if (normalized.archived) {
        await api.patch(`/orders/${normalized.id}/unarchive`);
        toast.success("Order unarchived");
      } else {
        await api.patch(`/orders/${normalized.id}/archive`);
        toast.success("Order archived");
      }
      await loadOrder();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to update archive status";
      toast.error(msg);
    }
  };

  const StatusPill = ({ value }) => (
    <span className="text-xs tracking-widest uppercase border border-gold/30 px-2 py-1 text-graphite">
      {String(value || "unknown")}
    </span>
  );

  const ArchivedPill = () => (
    <span className="text-xs tracking-widest uppercase border border-gold/30 px-2 py-1 bg-secondary text-charcoal">
      archived
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
              type="button"
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
              type="button"
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
            {normalized.archived ? <ArchivedPill /> : null}
            <p className="text-xs text-graphite">
              Created: <span className="font-semibold">{safeDate(normalized.createdAt)}</span>
            </p>
            <p className="text-xs text-graphite">
              Updated: <span className="font-semibold">{safeDate(normalized.updatedAt)}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleArchive}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase font-bold disabled:opacity-50"
            disabled={loading || !order}
            type="button"
            title={normalized.archived ? "Unarchive" : "Archive"}
          >
            <Archive className="w-4 h-4" />
            {normalized.archived ? "Unarchive" : "Archive"}
          </button>

          <button
            onClick={saveChanges}
            className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold disabled:opacity-50"
            disabled={saving || loading || !order}
            type="button"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
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
          {/* Left: Items + totals + history */}
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
                          <tr
                            key={it?.id || it?._id || it?.slug || idx}
                            className="border-t border-gold/20"
                          >
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

            {/* Status History */}
            <section className="bg-card border-2 border-gold/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-graphite" />
                <h2 className="font-serif text-2xl">Status history</h2>
              </div>

              {normalized.history.length === 0 ? (
                <div className="border border-gold/20 p-4 text-graphite">
                  No history yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {normalized.history
                    .slice()
                    .reverse()
                    .map((h, idx) => (
                      <div
                        key={`${h.at || "time"}-${idx}`}
                        className="border border-gold/20 p-4 flex items-start justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-charcoal">{h.status || "updated"}</p>
                          {h.note ? <p className="text-sm text-graphite mt-1">{h.note}</p> : null}
                        </div>
                        <p className="text-xs text-graphite whitespace-nowrap">{safeDate(h.at)}</p>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </div>

          {/* Right */}
          <div className="lg:col-span-5 space-y-6">
            <section className="bg-card border-2 border-gold/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="w-4 h-4 text-graphite" />
                <h2 className="font-serif text-2xl">Customer</h2>
              </div>

              <div className="border border-gold/20 p-4 space-y-2">
                <p className="font-serif text-xl">{normalized.customer?.name || "—"}</p>
                <p className="text-sm text-graphite">{normalized.customer?.email || "—"}</p>
                <p className="text-sm text-graphite">{normalized.customer?.phone || "—"}</p>
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
                  <span className="font-semibold">{pick(normalized.shipping, ["method"], "—")}</span>
                </p>
                <p className="text-graphite">
                  Location:{" "}
                  <span className="font-semibold">
                    {[normalized.shipping?.address, normalized.shipping?.city, normalized.shipping?.county]
                      .filter(Boolean)
                      .join(", ") || "—"}
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
                  <span className="font-semibold">{pick(normalized.payment, ["method"], "—")}</span>
                </p>
                <p className="text-graphite">
                  Status:{" "}
                  <span className="font-semibold">{pick(normalized.payment, ["status"], "—")}</span>
                </p>
                <p className="text-graphite">
                  Reference:{" "}
                  <span className="font-semibold">
                    {pick(normalized.payment, ["mpesaTransactionId", "transactionId", "reference"], "—")}
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
                  <p className="text-[11px] text-graphite mt-2">
                    Changing status adds a customer-visible update (saved into statusHistory).
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquareText className="w-4 h-4 text-graphite" />
                    <label className="block text-xs tracking-widest uppercase font-bold text-graphite">
                      Customer update note (shown on tracking page)
                    </label>
                  </div>
                  <textarea
                    value={customerUpdateNote}
                    onChange={(e) => setCustomerUpdateNote(e.target.value)}
                    className="w-full px-3 py-3 border border-gold/20 focus:border-gold bg-transparent font-serif min-h-[90px]"
                    placeholder="e.g. Your order has been dispatched. Rider will call upon arrival."
                  />
                  <p className="text-[11px] text-graphite mt-2">
                    If left blank, the system uses a default note based on the status.
                  </p>
                </div>

                <div>
                  <label className="block text-xs tracking-widest uppercase font-bold text-graphite mb-2">
                    Internal note (admin only)
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
                  type="button"
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