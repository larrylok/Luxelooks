import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Plus, Trash2, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const emptySettings = {
  currencyRates: { KES: 1.0, USD: 0.0077, EUR: 0.0071 },
  currencyRatesUpdated: new Date().toISOString(),
  shippingMethods: [],
  businessInfo: {
    brandName: "Luxe Looks",
    email: "",
    phone: "",
    whatsapp: "",
    instagram: "",
    address: "",
    city: "",
    county: "",
  },
  inventoryThreshold: 5,
  allowPreorders: true,
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currencyUpdatedHuman = useMemo(() => {
    try {
      const d = new Date(settings.currencyRatesUpdated);
      return isNaN(d.getTime()) ? "—" : d.toLocaleString();
    } catch {
      return "—";
    }
  }, [settings.currencyRatesUpdated]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/settings`);
      // Backend returns plain object w/ fields above
      setSettings({
        ...emptySettings,
        ...res.data,
        currencyRates: {
          ...emptySettings.currencyRates,
          ...(res.data?.currencyRates || {}),
        },
        businessInfo: {
          ...emptySettings.businessInfo,
          ...(res.data?.businessInfo || {}),
        },
        shippingMethods: Array.isArray(res.data?.shippingMethods)
          ? res.data.shippingMethods
          : [],
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load settings");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setRate = (key, value) => {
    const num = value === "" ? "" : Number(value);
    setSettings((s) => ({
      ...s,
      currencyRates: { ...s.currencyRates, [key]: num === "" ? "" : num },
    }));
  };

  const setBusiness = (key, value) => {
    setSettings((s) => ({
      ...s,
      businessInfo: { ...(s.businessInfo || {}), [key]: value },
    }));
  };

  const addShippingMethod = () => {
    setSettings((s) => ({
      ...s,
      shippingMethods: [
        ...(s.shippingMethods || []),
        {
          id: crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
          name: "Standard Delivery",
          cost: 0,
          etaDays: 2,
          enabled: true,
          notes: "",
        },
      ],
    }));
  };

  const updateShippingMethod = (index, patch) => {
    setSettings((s) => {
      const next = [...(s.shippingMethods || [])];
      next[index] = { ...(next[index] || {}), ...patch };
      return { ...s, shippingMethods: next };
    });
  };

  const removeShippingMethod = (index) => {
    setSettings((s) => {
      const next = [...(s.shippingMethods || [])];
      next.splice(index, 1);
      return { ...s, shippingMethods: next };
    });
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Ensure numeric values (pydantic expects floats/ints)
      const payload = {
        ...settings,
        currencyRatesUpdated: new Date().toISOString(),
        currencyRates: {
          KES: Number(settings.currencyRates?.KES ?? 1),
          USD: Number(settings.currencyRates?.USD ?? 0),
          EUR: Number(settings.currencyRates?.EUR ?? 0),
        },
        inventoryThreshold: Number(settings.inventoryThreshold ?? 5),
        allowPreorders: !!settings.allowPreorders,
        shippingMethods: (settings.shippingMethods || []).map((m) => ({
          ...m,
          cost: Number(m.cost ?? 0),
          etaDays: Number(m.etaDays ?? 0),
          enabled: !!m.enabled,
        })),
        businessInfo: settings.businessInfo || {},
      };

      await axios.put(`${API}/settings`, payload);
      toast.success("Settings saved");
      // reload to ensure we’re in sync with backend
      await loadSettings();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div>
        <h1 className="font-serif text-4xl mb-6">Settings</h1>
        <p className="text-graphite">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl mb-2">Settings</h1>
          <p className="text-graphite">
            Manage store configuration (currency, shipping, operations, business info).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSettings}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
            disabled={loading || saving}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={saveSettings}
            className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold disabled:opacity-50"
            disabled={saving}
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Operations */}
      <section className="bg-card border-2 border-gold/20 p-6">
        <h2 className="font-serif text-2xl mb-4">Operations</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
              Inventory threshold
            </label>
            <input
              type="number"
              min={0}
              value={settings.inventoryThreshold}
              onChange={(e) =>
                setSettings((s) => ({ ...s, inventoryThreshold: e.target.value }))
              }
              className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
            />
            <p className="text-xs text-graphite mt-2">
              Products at or below this stock count can be flagged as low stock.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                Allow preorders
              </label>
              <p className="text-xs text-graphite mb-3">
                If enabled, out-of-stock items can be marked as preorder (pay later or on
                availability depending on your flow).
              </p>
            </div>

            <button
              onClick={() =>
                setSettings((s) => ({ ...s, allowPreorders: !s.allowPreorders }))
              }
              className={`px-4 py-2 border text-xs tracking-widest uppercase font-bold transition-all ${
                settings.allowPreorders
                  ? "bg-charcoal text-gold border-gold"
                  : "bg-transparent text-charcoal border-gold/30 hover:border-gold"
              }`}
            >
              {settings.allowPreorders ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>
      </section>

      {/* Currency */}
      <section className="bg-card border-2 border-gold/20 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl mb-1">Currency rates</h2>
            <p className="text-xs text-graphite">
              Display-only conversion rates. Updated: <span className="font-semibold">{currencyUpdatedHuman}</span>
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-6">
          {["KES", "USD", "EUR"].map((k) => (
            <div key={k}>
              <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                {k} rate
              </label>
              <input
                type="number"
                step="0.0001"
                value={settings.currencyRates?.[k] ?? ""}
                onChange={(e) => setRate(k, e.target.value)}
                className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
              />
              <p className="text-xs text-graphite mt-2">
                Base is KES = 1.00. Example: USD ≈ 0.0077.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Shipping methods */}
      <section className="bg-card border-2 border-gold/20 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl">Shipping methods</h2>
            <p className="text-xs text-graphite mt-1">
              Add delivery options and costs shown at checkout.
            </p>
          </div>
          <button
            onClick={addShippingMethod}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
          >
            <Plus className="w-4 h-4" />
            Add method
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {(settings.shippingMethods || []).length === 0 ? (
            <div className="border border-gold/20 p-4 text-graphite">
              No shipping methods yet. Add one.
            </div>
          ) : (
            (settings.shippingMethods || []).map((m, idx) => (
              <div key={m.id || idx} className="border border-gold/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid md:grid-cols-4 gap-4 flex-1">
                    <div className="md:col-span-2">
                      <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                        Name
                      </label>
                      <input
                        value={m.name ?? ""}
                        onChange={(e) =>
                          updateShippingMethod(idx, { name: e.target.value })
                        }
                        className="w-full px-3 py-2 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                      />
                    </div>

                    <div>
                      <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                        Cost (KES)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={m.cost ?? 0}
                        onChange={(e) =>
                          updateShippingMethod(idx, { cost: e.target.value })
                        }
                        className="w-full px-3 py-2 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                      />
                    </div>

                    <div>
                      <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                        ETA (days)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={m.etaDays ?? 0}
                        onChange={(e) =>
                          updateShippingMethod(idx, { etaDays: e.target.value })
                        }
                        className="w-full px-3 py-2 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                        Notes
                      </label>
                      <input
                        value={m.notes ?? ""}
                        onChange={(e) =>
                          updateShippingMethod(idx, { notes: e.target.value })
                        }
                        className="w-full px-3 py-2 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                        placeholder="e.g. Nairobi only, Same-day within CBD, etc."
                      />
                    </div>

                    <div className="md:col-span-4 flex items-center gap-3">
                      <span className="text-xs tracking-widest uppercase font-bold text-charcoal">
                        Enabled
                      </span>
                      <button
                        onClick={() =>
                          updateShippingMethod(idx, { enabled: !m.enabled })
                        }
                        className={`px-3 py-2 border text-xs tracking-widest uppercase font-bold ${
                          m.enabled
                            ? "bg-charcoal text-gold border-gold"
                            : "bg-transparent text-charcoal border-gold/30 hover:border-gold"
                        }`}
                      >
                        {m.enabled ? "Yes" : "No"}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => removeShippingMethod(idx)}
                    className="p-2 border border-gold/30 hover:border-gold text-charcoal"
                    title="Remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Business info */}
      <section className="bg-card border-2 border-gold/20 p-6">
        <h2 className="font-serif text-2xl mb-4">Business info</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {[
            ["brandName", "Brand name"],
            ["email", "Support email"],
            ["phone", "Phone"],
            ["whatsapp", "WhatsApp"],
            ["instagram", "Instagram"],
            ["address", "Address"],
            ["city", "City"],
            ["county", "County"],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                {label}
              </label>
              <input
                value={settings.businessInfo?.[key] ?? ""}
                onChange={(e) => setBusiness(key, e.target.value)}
                className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
              />
            </div>
          ))}
        </div>

        <p className="text-xs text-graphite mt-6">
          These values can be displayed in the footer, checkout, invoices, and customer emails.
        </p>
      </section>
    </div>
  );
}

