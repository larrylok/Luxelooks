import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Plus, Save, X, Search, RefreshCw, Star, StarOff } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function slugify(input) {
  return (input || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getAuthHeaders() {
  // If your backend expects auth, this will help (no harm if it doesn't).
  // Adjust key names if your AdminLogin stores token differently.
  const token =
    localStorage.getItem("admin_token") ||
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const emptyDraft = {
  _id: null,
  id: null,
  name: "",
  slug: "",
  description: "",
  heroImage: "",
  displayOrder: 0,
  featured: false,
  active: true, // if backend supports
};

export default function AdminCollections() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const slug = (c.slug || "").toLowerCase();
      const desc = (c.description || "").toLowerCase();
      return name.includes(s) || slug.includes(s) || desc.includes(s);
    });
  }, [items, q]);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/collections`, {
        headers: { ...getAuthHeaders() },
      });

      // Support either {items: [...]} or [...] responses
      const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setItems(
        data
          .slice()
          .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0))
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to load collections");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setDraft(emptyDraft);
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setDraft({
      ...emptyDraft,
      ...c,
      // normalize common id fields
      _id: c?._id ?? null,
      id: c?.id ?? null,
      displayOrder: Number(c?.displayOrder ?? 0),
      featured: !!c?.featured,
      active: c?.active === undefined ? true : !!c?.active,
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setDraft(emptyDraft);
  };

  const onChange = (key, value) => {
    setDraft((d) => {
      const next = { ...d, [key]: value };
      // auto-slug when creating or when slug is empty
      if (key === "name") {
        const auto = slugify(value);
        if (!d.slug || d.slug === slugify(d.name)) {
          next.slug = auto;
        }
      }
      return next;
    });
  };

  const validateDraft = () => {
    if (!draft.name.trim()) return "Collection name is required.";
    if (!draft.slug.trim()) return "Slug is required (auto-generated from name).";
    return null;
  };

  const saveDraft = async () => {
    const errMsg = validateDraft();
    if (errMsg) {
      toast.error(errMsg);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        slug: draft.slug.trim(),
        description: (draft.description || "").trim(),
        heroImage: (draft.heroImage || "").trim(),
        displayOrder: Number(draft.displayOrder ?? 0),
        featured: !!draft.featured,
        active: draft.active === undefined ? true : !!draft.active,
      };

      // Determine id field
      const id = draft._id || draft.id;

      if (id) {
        await axios.put(`${API}/collections/${id}`, payload, {
          headers: { ...getAuthHeaders() },
        });
        toast.success("Collection updated");
      } else {
        await axios.post(`${API}/collections`, payload, {
          headers: { ...getAuthHeaders() },
        });
        toast.success("Collection created");
      }

      closeModal();
      await loadCollections();
    } catch (err) {
      console.error(err);
      // Try to surface backend message if present
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to save collection";
      toast.error(msg);
    }
    setSaving(false);
  };

  const toggleFeatured = async (c) => {
    const id = c?._id || c?.id;
    if (!id) return;

    try {
      await axios.put(
        `${API}/collections/${id}`,
        { ...c, featured: !c.featured },
        { headers: { ...getAuthHeaders() } }
      );
      toast.success(!c.featured ? "Marked as featured" : "Unfeatured");
      await loadCollections();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update featured status");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl mb-2">Collections</h1>
          <p className="text-graphite">
            Curate product groupings for your storefront (featured sections, seasonal edits, etc.).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadCollections}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold"
          >
            <Plus className="w-4 h-4" />
            New collection
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-card border-2 border-gold/20 p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-graphite" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search collections by name, slug, description…"
          className="w-full bg-transparent focus:outline-none font-serif"
        />
      </div>

      {/* List */}
      <section className="bg-card border-2 border-gold/20 p-6">
        <h2 className="font-serif text-2xl mb-4">All collections</h2>

        {loading ? (
          <p className="text-graphite">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="border border-gold/20 p-4 text-graphite">
            No collections found. Create one to start curating your storefront.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((c) => (
              <div
                key={c._id || c.id || c.slug}
                className="border border-gold/20 p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-serif text-xl truncate">{c.name || "Untitled"}</h3>

                    <span className="text-xs tracking-widest uppercase border border-gold/30 px-2 py-1 text-graphite">
                      /{c.slug || "no-slug"}
                    </span>

                    {c.featured ? (
                      <span className="text-xs tracking-widest uppercase border border-gold px-2 py-1 text-charcoal">
                        Featured
                      </span>
                    ) : null}

                    {c.active === false ? (
                      <span className="text-xs tracking-widest uppercase border border-gold/30 px-2 py-1 text-graphite">
                        Disabled
                      </span>
                    ) : null}
                  </div>

                  {c.description ? (
                    <p className="text-sm text-graphite mt-2 line-clamp-2">{c.description}</p>
                  ) : (
                    <p className="text-sm text-graphite mt-2 italic">No description</p>
                  )}

                  <div className="text-xs text-graphite mt-3 flex items-center gap-4">
                    <span>
                      Display order: <span className="font-semibold">{Number(c.displayOrder ?? 0)}</span>
                    </span>
                    {c.heroImage ? (
                      <span className="truncate">
                        Hero: <span className="font-semibold">{c.heroImage}</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleFeatured(c)}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
                    title="Toggle featured"
                  >
                    {c.featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    {c.featured ? "Unfeature" : "Feature"}
                  </button>

                  <button
                    onClick={() => openEdit(c)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal */}
      {modalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card border-2 border-gold/30 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-2xl">
                  {draft._id || draft.id ? "Edit collection" : "Create collection"}
                </h2>
                <p className="text-xs text-graphite mt-1">
                  This controls how collections appear on the storefront.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="p-2 border border-gold/30 hover:border-gold"
                title="Close"
                disabled={saving}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div className="md:col-span-2">
                <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                  Name
                </label>
                <input
                  value={draft.name}
                  onChange={(e) => onChange("name", e.target.value)}
                  className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                  placeholder="e.g. Valentine’s Edit"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                  Slug
                </label>
                <input
                  value={draft.slug}
                  onChange={(e) => onChange("slug", slugify(e.target.value))}
                  className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                  placeholder="valentines-edit"
                />
                <p className="text-xs text-graphite mt-2">
                  Used in URLs and internal references. Lowercase, hyphens only.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                  Description
                </label>
                <textarea
                  value={draft.description}
                  onChange={(e) => onChange("description", e.target.value)}
                  className="w-full px-4 py-3 border border-gold/20 focus:border-gold bg-transparent focus:ring-0 font-serif min-h-[110px]"
                  placeholder="Short description shown on collection sections."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                  Hero image URL
                </label>
                <input
                  value={draft.heroImage}
                  onChange={(e) => onChange("heroImage", e.target.value)}
                  className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                  placeholder="https://…"
                />
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                  Display order
                </label>
                <input
                  type="number"
                  value={draft.displayOrder}
                  onChange={(e) => onChange("displayOrder", e.target.value)}
                  className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                />
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                    Featured
                  </label>
                  <p className="text-xs text-graphite">
                    Featured collections can be highlighted on the homepage.
                  </p>
                </div>

                <button
                  onClick={() => onChange("featured", !draft.featured)}
                  className={`px-4 py-2 border text-xs tracking-widest uppercase font-bold transition-all ${
                    draft.featured
                      ? "bg-charcoal text-gold border-gold"
                      : "bg-transparent text-charcoal border-gold/30 hover:border-gold"
                  }`}
                  disabled={saving}
                >
                  {draft.featured ? "Enabled" : "Disabled"}
                </button>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                    Active
                  </label>
                  <p className="text-xs text-graphite">
                    If disabled, it won’t be shown on the storefront.
                  </p>
                </div>

                <button
                  onClick={() => onChange("active", !draft.active)}
                  className={`px-4 py-2 border text-xs tracking-widest uppercase font-bold transition-all ${
                    draft.active
                      ? "bg-charcoal text-gold border-gold"
                      : "bg-transparent text-charcoal border-gold/30 hover:border-gold"
                  }`}
                  disabled={saving}
                >
                  {draft.active ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-8">
              <button
                onClick={closeModal}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
                disabled={saving}
              >
                <X className="w-4 h-4" />
                Cancel
              </button>

              <button
                onClick={saveDraft}
                className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold disabled:opacity-50"
                disabled={saving}
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

