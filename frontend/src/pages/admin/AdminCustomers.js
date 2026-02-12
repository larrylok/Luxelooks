import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { RefreshCw, Search, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

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

function parseISODate(s) {
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function niceDate(s) {
  const d = parseISODate(s);
  return d ? d.toLocaleString() : "—";
}

function keyForCustomer(customer) {
  const email = (customer?.email || "").trim().toLowerCase();
  const phone = (customer?.phone || "").trim();
  // Prefer email; fallback to phone; last resort random-ish
  return email || phone || `unknown:${customer?.name || ""}`;
}

export default function AdminCustomers() {
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [customers, setCustomers] = useState([]);
  const [ordersLoaded, setOrdersLoaded] = useState(0);

  const [selected, setSelected] = useState(null); // customer object for modal

  const loadCustomers = async () => {
    setLoading(true);
    setOrdersLoaded(0);

    try {
      // Pull orders in pages and derive customers.
      // This avoids adding new backend endpoints.
      const pageSize = 100;
      const maxPages = 20; // safety cap (up to 2000 orders)
      let page = 1;

      const allOrders = [];

      while (page <= maxPages) {
        const res = await axios.get(`${API}/orders`, {
          params: { page, limit: pageSize },
          headers: { ...getAuthHeaders() },
        });

        const data = res.data || {};
        const batch = Array.isArray(data.orders) ? data.orders : [];
        const totalPages = toNum(data.pages, 1);

        allOrders.push(...batch);
        setOrdersLoaded(allOrders.length);

        if (page >= totalPages) break;
        page += 1;
      }

      // Aggregate customers
      const map = new Map();

      for (const o of allOrders) {
        const c = o?.customer || {};
        const key = keyForCustomer(c);

        const createdAt = o?.createdAt || o?.updatedAt;
        const d = parseISODate(createdAt);

        const total = toNum(o?.total, 0);

        if (!map.has(key)) {
          map.set(key, {
            key,
            name: c?.name || "Unknown",
            email: c?.email || "",
            phone: c?.phone || "",
            isGuest: !!c?.isGuest,
            ordersCount: 0,
            totalSpend: 0,
            firstOrderAt: createdAt || null,
            lastOrderAt: createdAt || null,
            statuses: {}, // {pending: 2, delivered: 1, ...}
            recentOrders: [],
          });
        }

        const entry = map.get(key);

        entry.ordersCount += 1;
        entry.totalSpend += total;

        // status counts
        const st = (o?.status || "unknown").toLowerCase();
        entry.statuses[st] = (entry.statuses[st] || 0) + 1;

        // first/last
        const firstD = parseISODate(entry.firstOrderAt);
        const lastD = parseISODate(entry.lastOrderAt);

        if (d) {
          if (!firstD || d < firstD) entry.firstOrderAt = createdAt;
          if (!lastD || d > lastD) entry.lastOrderAt = createdAt;
        }

        // keep up to 8 most recent orders for modal
        entry.recentOrders.push({
          id: o?.id,
          orderNumber: o?.orderNumber,
          total: total,
          status: o?.status || "unknown",
          createdAt: o?.createdAt,
        });
      }

      const list = Array.from(map.values())
        .map((c) => ({
          ...c,
          totalSpend: Math.round(c.totalSpend),
          // sort recent orders newest-first
          recentOrders: c.recentOrders
            .filter((x) => x?.id)
            .sort((a, b) => {
              const da = parseISODate(a.createdAt)?.getTime() || 0;
              const db = parseISODate(b.createdAt)?.getTime() || 0;
              return db - da;
            })
            .slice(0, 8),
        }))
        .sort((a, b) => {
          // Default sort: highest spend then most orders
          const spend = toNum(b.totalSpend) - toNum(a.totalSpend);
          if (spend !== 0) return spend;
          return toNum(b.ordersCount) - toNum(a.ordersCount);
        });

      setCustomers(list);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to load customers";
      toast.error(msg);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      return name.includes(s) || email.includes(s) || phone.includes(s);
    });
  }, [customers, q]);

  const kpis = useMemo(() => {
    const total = customers.length;
    const repeat = customers.filter((c) => toNum(c.ordersCount) >= 2).length;

    // VIP: top 10% by spend, minimum 1
    const sorted = customers.slice().sort((a, b) => toNum(b.totalSpend) - toNum(a.totalSpend));
    const vipCount = Math.max(1, Math.floor(sorted.length * 0.1));
    const vipThreshold = sorted[vipCount - 1]?.totalSpend ?? 0;
    const vip = customers.filter((c) => toNum(c.totalSpend) >= toNum(vipThreshold)).length;

    return { total, repeat, vip };
  }, [customers]);

  const openCustomer = (c) => setSelected(c);
  const closeCustomer = () => setSelected(null);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl mb-2">Customers</h1>
          <p className="text-graphite">
            Derived from your orders — customer profiles, spend, and purchase history.
          </p>
        </div>

        <button
          onClick={loadCustomers}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
          disabled={loading}
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <section className="grid md:grid-cols-3 gap-4">
        <div className="bg-card border-2 border-gold/20 p-5">
          <p className="text-xs tracking-widest uppercase text-graphite font-bold">
            Total customers
          </p>
          <p className="font-serif text-3xl mt-2">{kpis.total.toLocaleString()}</p>
          <p className="text-xs text-graphite mt-2">
            Based on unique email/phone from orders
          </p>
        </div>

        <div className="bg-card border-2 border-gold/20 p-5">
          <p className="text-xs tracking-widest uppercase text-graphite font-bold">
            Repeat customers
          </p>
          <p className="font-serif text-3xl mt-2">{kpis.repeat.toLocaleString()}</p>
          <p className="text-xs text-graphite mt-2">2+ orders</p>
        </div>

        <div className="bg-card border-2 border-gold/20 p-5">
          <p className="text-xs tracking-widest uppercase text-graphite font-bold">
            VIP segment
          </p>
          <p className="font-serif text-3xl mt-2">{kpis.vip.toLocaleString()}</p>
          <p className="text-xs text-graphite mt-2">Top ~10% by spend</p>
        </div>
      </section>

      {/* Search */}
      <div className="bg-card border-2 border-gold/20 p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-graphite" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, phone…"
          className="w-full bg-transparent focus:outline-none font-serif"
        />
        <div className="text-xs text-graphite">
          {loading ? "Loading…" : `${filtered.length} shown`}
        </div>
      </div>

      {/* Table */}
      <section className="bg-card border-2 border-gold/20 p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-serif text-2xl">Customer list</h2>
          <p className="text-xs text-graphite">
            Orders scanned: <span className="font-semibold">{ordersLoaded}</span>
          </p>
        </div>

        <div className="mt-4 overflow-auto border border-gold/20">
          <table className="w-full text-left">
            <thead className="bg-black/5">
              <tr>
                <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                  Customer
                </th>
                <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                  Orders
                </th>
                <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                  Total spend
                </th>
                <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                  Last order
                </th>
                <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                  Status mix
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="p-4 text-graphite" colSpan={5}>
                    Building customers from orders…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="p-4 text-graphite" colSpan={5}>
                    No customers found.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.key}
                    className="border-t border-gold/20 hover:bg-black/5 cursor-pointer"
                    onClick={() => openCustomer(c)}
                    title="Open customer"
                  >
                    <td className="p-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-serif text-lg truncate">{c.name}</p>
                          {c.isGuest ? (
                            <span className="text-xs tracking-widest uppercase border border-gold/30 px-2 py-1 text-graphite">
                              Guest
                            </span>
                          ) : null}
                          {toNum(c.ordersCount) >= 2 ? (
                            <span className="text-xs tracking-widest uppercase border border-gold px-2 py-1 text-charcoal">
                              Repeat
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-graphite truncate">
                          {c.email || "—"} {c.phone ? `• ${c.phone}` : ""}
                        </p>
                      </div>
                    </td>

                    <td className="p-3 font-semibold">{toNum(c.ordersCount).toLocaleString()}</td>
                    <td className="p-3 font-semibold">{fmtKES(c.totalSpend)}</td>
                    <td className="p-3">{niceDate(c.lastOrderAt)}</td>

                    <td className="p-3 text-xs text-graphite">
                      {Object.keys(c.statuses || {}).length === 0
                        ? "—"
                        : Object.entries(c.statuses)
                            .sort((a, b) => toNum(b[1]) - toNum(a[1]))
                            .slice(0, 3)
                            .map(([k, v]) => `${k}:${v}`)
                            .join(" • ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Customer modal */}
      {selected ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-card border-2 border-gold/30 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-serif text-2xl truncate">{selected.name}</h2>
                <p className="text-xs text-graphite mt-1">
                  {selected.email || "—"} {selected.phone ? `• ${selected.phone}` : ""}
                </p>
              </div>

              <button
                onClick={closeCustomer}
                className="p-2 border border-gold/30 hover:border-gold"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-6">
              <div className="border border-gold/20 p-4">
                <p className="text-xs tracking-widest uppercase text-graphite font-bold">
                  Orders
                </p>
                <p className="font-serif text-2xl mt-2">
                  {toNum(selected.ordersCount).toLocaleString()}
                </p>
              </div>

              <div className="border border-gold/20 p-4">
                <p className="text-xs tracking-widest uppercase text-graphite font-bold">
                  Total spend
                </p>
                <p className="font-serif text-2xl mt-2">{fmtKES(selected.totalSpend)}</p>
              </div>

              <div className="border border-gold/20 p-4">
                <p className="text-xs tracking-widest uppercase text-graphite font-bold">
                  Last order
                </p>
                <p className="font-serif text-base mt-2">{niceDate(selected.lastOrderAt)}</p>
              </div>
            </div>

            <div className="mt-6 border border-gold/20 p-4">
              <p className="text-xs tracking-widest uppercase text-graphite font-bold">
                Timeline
              </p>
              <p className="text-sm text-graphite mt-2">
                First order: <span className="font-semibold">{niceDate(selected.firstOrderAt)}</span>
                {"  "}•{"  "}
                Last order: <span className="font-semibold">{niceDate(selected.lastOrderAt)}</span>
              </p>
            </div>

            <div className="mt-6">
              <div className="flex items-end justify-between gap-4">
                <h3 className="font-serif text-xl">Recent orders</h3>
                <p className="text-xs text-graphite">Showing up to 8</p>
              </div>

              <div className="mt-3 overflow-auto border border-gold/20">
                <table className="w-full text-left">
                  <thead className="bg-black/5">
                    <tr>
                      <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                        Order
                      </th>
                      <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                        Date
                      </th>
                      <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                        Status
                      </th>
                      <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                        Total
                      </th>
                      <th className="p-3 text-xs tracking-widest uppercase font-bold text-graphite">
                        Open
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.recentOrders?.length ? (
                      selected.recentOrders.map((o) => (
                        <tr key={o.id} className="border-t border-gold/20">
                          <td className="p-3">
                            <p className="font-serif text-lg">
                              {o.orderNumber || o.id}
                            </p>
                            <p className="text-xs text-graphite">{o.id}</p>
                          </td>
                          <td className="p-3">{niceDate(o.createdAt)}</td>
                          <td className="p-3">
                            <span className="text-xs tracking-widest uppercase border border-gold/30 px-2 py-1 text-graphite">
                              {String(o.status || "unknown")}
                            </span>
                          </td>
                          <td className="p-3 font-semibold">{fmtKES(o.total)}</td>
                          <td className="p-3">
                            <Link
                              to={`/admin/orders/${o.id}`}
                              className="inline-flex items-center gap-2 px-3 py-2 border border-gold/30 hover:border-gold text-xs tracking-widest uppercase"
                              onClick={closeCustomer}
                              title="Open order"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-4 text-graphite" colSpan={5}>
                          No orders available for this customer.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 text-xs text-graphite">
              Note: Customers are generated from orders (no separate customer database yet).
              If you want full CRM (accounts, addresses, notes), we’ll add a dedicated collection + endpoints.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
