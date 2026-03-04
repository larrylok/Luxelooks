import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Search, PackageCheck, Truck, Clock, CheckCircle2 } from "lucide-react";
import api from "@/api";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
}

function statusIcon(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("deliver")) return <CheckCircle2 className="w-5 h-5" />;
  if (s.includes("ship") || s.includes("dispatch")) return <Truck className="w-5 h-5" />;
  if (s.includes("confirm") || s.includes("paid")) return <PackageCheck className="w-5 h-5" />;
  return <Clock className="w-5 h-5" />;
}

function normalizeHistoryItem(h) {
  if (!h || typeof h !== "object") return null;
  // support both shapes: { at } (recommended) or { timestamp } (older)
  const at = h.at || h.timestamp || h.time || h.createdAt || null;
  return {
    status: h.status || "",
    note: h.note || "",
    at,
  };
}

export default function TrackOrder() {
  const query = useQuery();

  const [orderNumber, setOrderNumber] = useState(query.get("orderNumber") || "");
  const [phone, setPhone] = useState(query.get("phone") || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fetchStatus = async () => {
    const on = orderNumber.trim();
    const ph = phone.trim();

    if (!on) {
      toast.error("Enter your Order Number");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      /**
       * ✅ Primary (recommended) endpoint:
       * GET /api/orders/track/{orderNumber}
       */
      const res = await api.get(`/orders/track/${encodeURIComponent(on)}`);

      let data = res?.data;

      /**
       * ✅ Optional phone check (frontend-only)
       * If you want phone to be REQUIRED, tell me and I'll give you backend validation too.
       */
      const serverPhone = String(data?.customer?.phone || "").trim();
      if (ph && serverPhone && ph !== serverPhone) {
        toast.error("Phone number does not match this order.");
        setResult(null);
        return;
      }

      setResult(data);
      toast.success("Order status loaded");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Could not find that order";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // auto-load if query params exist
  useEffect(() => {
    const on = (query.get("orderNumber") || "").trim();
    if (on) fetchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizedHistory = useMemo(() => {
    const hist = Array.isArray(result?.statusHistory) ? result.statusHistory : [];
    return hist
      .map(normalizeHistoryItem)
      .filter(Boolean)
      .sort((a, b) => new Date(a.at || 0) - new Date(b.at || 0));
  }, [result]);

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1100px]">
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-charcoal mb-4">
          Track Your Order
        </h1>
        <p className="text-graphite mb-10">
          Enter your <span className="font-semibold">Order Number</span>.
          <span className="text-graphite/80"> (Phone is optional for extra verification.)</span>
        </p>

        <div className="bg-card border-2 border-gold/20 p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                Order Number
              </label>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="LL-2026-0001"
                className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                Phone (optional)
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
              />
            </div>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold disabled:opacity-50"
              type="button"
            >
              <Search className="w-4 h-4" />
              {loading ? "Checking…" : "Track order"}
            </button>
          </div>
        </div>

        {result ? (
          <div className="mt-8 space-y-6">
            <div className="bg-card border-2 border-gold/20 p-8">
              <div className="flex items-start justify-between gap-6 flex-wrap">
                <div>
                  <p className="text-xs tracking-widest uppercase text-graphite">Order Number</p>
                  <p className="font-serif text-2xl text-charcoal">{result.orderNumber}</p>
                </div>

                <div>
                  <p className="text-xs tracking-widest uppercase text-graphite">Current Status</p>
                  <p className="inline-flex items-center gap-2 font-semibold text-charcoal">
                    {statusIcon(result.status)}
                    {result.status || "pending"}
                  </p>
                </div>

                <div>
                  <p className="text-xs tracking-widest uppercase text-graphite">Delivery</p>
                  <p className="text-charcoal">
                    {result.delivery?.city || ""}
                    {result.delivery?.city ? ", " : ""}
                    {result.delivery?.county || ""}
                  </p>
                  <p className="text-sm text-graphite">
                    Method: {result.delivery?.method || "standard"} • Cost: KES{" "}
                    {Number(result.delivery?.cost || 0).toLocaleString()}
                  </p>
                </div>
              </div>

              {result.trackingUrl ? (
                <div className="mt-6 border border-gold/20 p-4 bg-secondary/40">
                  <p className="text-xs tracking-widest uppercase text-graphite mb-2">Tracking Link</p>
                  <a
                    className="text-gold hover:underline break-all"
                    href={result.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.trackingUrl}
                  </a>
                </div>
              ) : null}
            </div>

            <div className="bg-card border-2 border-gold/20 p-8">
              <h2 className="font-serif text-2xl text-charcoal mb-4">Status Updates</h2>

              {normalizedHistory.length > 0 ? (
                <div className="space-y-3">
                  {normalizedHistory.map((h, idx) => (
                    <div
                      key={idx}
                      className="border border-gold/20 p-4 flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-charcoal inline-flex items-center gap-2">
                          {statusIcon(h.status)}
                          {h.status || "updated"}
                        </p>
                        {h.note ? <p className="text-sm text-graphite mt-1">{h.note}</p> : null}
                      </div>
                      <p className="text-xs text-graphite whitespace-nowrap">
                        {formatDate(h.at)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-gold/20 p-4 text-graphite">
                  No updates yet. Check again soon.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}