import React, { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import api from "../../api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

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

function safeDateLabel(d) {
  // Accepts "YYYY-MM-DD" or ISO; falls back to raw label
  try {
    const date = new Date(d);
    if (!isNaN(date.getTime())) return date.toLocaleDateString();
  } catch {}
  return String(d || "");
}

function dateKeyToTime(d) {
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : 0;
}

export default function AdminReports() {
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState("30d"); // "7d" | "30d" | "90d"
  const [revenue, setRevenue] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    series: [],
  });
  const [bestsellers, setBestsellers] = useState([]);

  // ✅ Prevent stale responses overwriting the latest range
  const requestSeq = useRef(0);

  const days = useMemo(() => {
    if (range === "7d") return 7;
    if (range === "90d") return 90;
    return 30;
  }, [range]);

  const loadReports = async () => {
    const seq = ++requestSeq.current;
    setLoading(true);

    try {
      const [revRes, bestRes] = await Promise.all([
        api.get(`/reports/revenue`, { params: { days } }),
        api.get(`/reports/bestsellers`, { params: { limit: 10, days } }),
      ]);

      // If a newer request already started, ignore this response
      if (seq !== requestSeq.current) return;

      // --- Normalize revenue response ---
      const r = revRes.data || {};

      const totalRevenue =
        r.totalRevenue ??
        r.total_revenue ??
        r.totals?.totalRevenue ??
        r.totals?.total_revenue ??
        0;

      const totalOrders =
        r.totalOrders ??
        r.total_orders ??
        r.totals?.totalOrders ??
        r.totals?.total_orders ??
        0;

      const averageOrderValue =
        r.averageOrderValue ??
        r.average_order_value ??
        r.avgOrderValue ??
        r.totals?.averageOrderValue ??
        0;

      const rawSeries = Array.isArray(r.series)
        ? r.series
        : Array.isArray(r.daily)
          ? r.daily
          : Array.isArray(r.data)
            ? r.data
            : [];

      const series = rawSeries
        .map((d) => ({
          date: d.date || d.day || d._id || d.label,
          revenue:
            d.revenue ??
            d.totalRevenue ??
            d.total_revenue ??
            d.amount ??
            d.sum ??
            0,
          orders: d.orders ?? d.totalOrders ?? d.total_orders ?? d.count ?? 0,
        }))
        .filter((x) => x.date)
        .map((x) => ({
          ...x,
          revenue: toNum(x.revenue, 0),
          orders: toNum(x.orders, 0),
        }))
        .sort((a, b) => dateKeyToTime(a.date) - dateKeyToTime(b.date));

      setRevenue({
        totalRevenue: toNum(totalRevenue, 0),
        totalOrders: toNum(totalOrders, 0),
        averageOrderValue: toNum(averageOrderValue, 0),
        series,
      });

      // --- Normalize bestsellers response ---
      const b = bestRes.data;
      const list = Array.isArray(b) ? b : b?.items || b?.products || [];

      setBestsellers(
        list
          .map((p) => ({
            id: p._id || p.id || p.productId || p.slug,
            name: p.name || p.title || p.productName || "Unnamed",
            slug: p.slug || "",
            purchases: toNum(
              p.totalPurchases ?? p.purchases ?? p.count ?? p.unitsSold ?? 0,
              0
            ),
            revenue: toNum(
              p.revenue ?? p.totalRevenue ?? p.total_revenue ?? p.sales ?? 0,
              0
            ),
            price: toNum(p.price ?? p.unitPrice ?? 0, 0),
            image: p.image || p.imageUrl || p.thumbnail || "",
          }))
          .filter((x) => x.id)
          .sort((a, b) => b.purchases - a.purchases)
      );
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load reports";
      toast.error(msg);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const kpis = useMemo(() => {
    const aov =
      revenue.averageOrderValue ||
      (revenue.totalOrders > 0 ? revenue.totalRevenue / revenue.totalOrders : 0);

    const top = bestsellers?.[0];
    return {
      totalRevenue: revenue.totalRevenue,
      totalOrders: revenue.totalOrders,
      aov,
      topProduct: top ? top.name : "—",
      topProductPurchases: top ? toNum(top.purchases, 0) : 0,
    };
  }, [revenue, bestsellers]);

  const chartData = useMemo(() => {
    return (revenue.series || []).map((p) => ({
      ...p,
      label: safeDateLabel(p.date),
    }));
  }, [revenue.series]);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl mb-2">Reports</h1>
          <p className="text-graphite">
            Revenue, order volume, and best-selling products.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-gold/30 bg-card">
            {[
              { key: "7d", label: "7D" },
              { key: "30d", label: "30D" },
              { key: "90d", label: "90D" },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRange(opt.key)}
                className={`px-4 py-2 text-xs tracking-widest uppercase font-bold border-r border-gold/20 last:border-r-0 transition-all ${
                  range === opt.key
                    ? "bg-charcoal text-gold"
                    : "bg-transparent text-charcoal hover:bg-black/5"
                }`}
                disabled={loading}
                title={`Last ${opt.label}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadReports}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <section className="grid md:grid-cols-4 gap-4">
        <div className="bg-card border-2 border-gold/20 p-5">
          <p className="text-xs tracking-widest uppercase text-graphite font-bold">
            Total revenue
          </p>
          <p className="font-serif text-3xl mt-2">{fmtKES(kpis.totalRevenue)}</p>
          <p className="text-xs text-graphite mt-2">Last {days} days</p>
        </div>

        <div className="bg-card border-2 border-gold/20 p-5">
          <p className="text-xs tracking-widest uppercase text-graphite font-bold">
            Orders
          </p>
          <p className="font-serif text-3xl mt-2">
            {toNum(kpis.totalOrders, 0).toLocaleString()}
          </p>
          <p className="text-xs text-graphite mt-2">Last {days} days</p>
        </div>

        <div className="bg-card border-2 border-gold/20 p-5">
          <p className="text-xs tracking-widest uppercase text-graphite font-bold">
            Avg order value
          </p>
          <p className="font-serif text-3xl mt-2">{fmtKES(kpis.aov)}</p>
          <p className="text-xs text-graphite mt-2">Last {days} days</p>
        </div>

        <div className="bg-card border-2 border-gold/20 p-5">
          <p className="text-xs tracking-widest uppercase text-graphite font-bold">
            Top product
          </p>
          <p className="font-serif text-xl mt-2 line-clamp-2">{kpis.topProduct}</p>
          <p className="text-xs text-graphite mt-2">
            Purchases:{" "}
            <span className="font-semibold">{kpis.topProductPurchases}</span>
          </p>
        </div>
      </section>

      <section className="bg-card border-2 border-gold/20 p-6">
        <div>
          <h2 className="font-serif text-2xl mb-1">Revenue trend</h2>
          <p className="text-xs text-graphite">Daily revenue for the last {days} days.</p>
        </div>

        <div className="mt-6" style={{ width: "100%", height: 260 }}>
          {loading ? (
            <p className="text-graphite">Loading chart…</p>
          ) : chartData.length === 0 ? (
            <div className="border border-gold/20 p-4 text-graphite">
              No revenue series data available yet.
            </div>
          ) : (
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => fmtKES(v)} />
                <Tooltip
                  formatter={(value, name) =>
                    name === "revenue"
                      ? [fmtKES(value), "Revenue"]
                      : [toNum(value, 0), "Orders"]
                  }
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line type="monotone" dataKey="revenue" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="bg-card border-2 border-gold/20 p-6">
        <h2 className="font-serif text-2xl mb-4">Bestsellers</h2>

        {loading ? (
          <p className="text-graphite">Loading…</p>
        ) : bestsellers.length === 0 ? (
          <div className="border border-gold/20 p-4 text-graphite">
            No bestseller data available yet.
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
                    Purchases
                  </th>
                  <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                    Revenue
                  </th>
                  <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                    Unit price
                  </th>
                </tr>
              </thead>
              <tbody>
                {bestsellers.map((p) => (
                  <tr key={p.id} className="border-t border-gold/20">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 object-cover border border-gold/20"
                          />
                        ) : (
                          <div className="w-10 h-10 border border-gold/20 bg-black/5" />
                        )}
                        <div className="min-w-0">
                          <p className="font-serif text-lg truncate">{p.name}</p>
                          {p.slug ? (
                            <p className="text-xs text-graphite truncate">/{p.slug}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 font-semibold">{p.purchases.toLocaleString()}</td>
                    <td className="p-3 font-semibold">{fmtKES(p.revenue)}</td>
                    <td className="p-3">{fmtKES(p.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
