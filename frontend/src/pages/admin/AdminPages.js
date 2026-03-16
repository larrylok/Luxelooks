import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Save,
  X,
  Search,
  RefreshCw,
  Star,
  StarOff,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import api from "../../api";

function slugify(input) {
  return (input || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function parseCsvIds(value) {
  return (value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function newEmptyDraft() {
  return {
    id: null,
    name: "",
    slug: "",
    description: "",
    type: "manual",
    categorySlug: "",
    productIdsText: "",
    displayOrder: 0,
    active: true,
    showInHeader: false,
    showInFooter: true,
    featured: false,
    seoTitle: "",
    seoDescription: "",
  };
}

function normalizePage(p) {
  const id = p?._id || p?.id || null;
  const productIds = Array.isArray(p?.productIds) ? p.productIds : [];

  return {
    ...p,
    id,
    name: p?.name || "",
    slug: p?.slug || "",
    description: p?.description || "",
    type: p?.type || "manual",
    categorySlug: p?.categorySlug || "",
    productIds,
    productIdsText: productIds.join(", "),
    displayOrder: toNum(p?.displayOrder, 0),
    active: p?.active !== false,
    showInHeader: !!p?.showInHeader,
    showInFooter: p?.showInFooter !== false,
    featured: !!p?.featured,
    seoTitle: p?.seoTitle || "",
    seoDescription: p?.seoDescription || "",
  };
}

export default function AdminPages() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(newEmptyDraft);

  const requestSeq = useRef(0);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const slug = (p.slug || "").toLowerCase();
      const desc = (p.description || "").toLowerCase();
      const type = (p.type || "").toLowerCase();
      return name.includes(s) || slug.includes(s) || desc.includes(s) || type.includes(s);
    });
  }, [items, q]);

  const loadPages = async () => {
    const seq = ++requestSeq.current;
    setLoading(true);

    try {
      const [pagesRes, categoriesRes] = await Promise.all([
        api.get(`/pages`),
        api.get(`/categories`),
      ]);

      if (seq !== requestSeq.current) return;

      const pagesData = Array.isArray(pagesRes.data) ? pagesRes.data : pagesRes.data?.items || [];
      const categoriesData = Array.isArray(categoriesRes.data)
        ? categoriesRes.data
        : categoriesRes.data?.items || [];

      const normalizedPages = pagesData.map(normalizePage);

      setItems(
        normalizedPages
          .slice()
          .sort((a, b) => toNum(a.displayOrder, 0) - toNum(b.displayOrder, 0))
      );
      setCategories(categoriesData);
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error(err);
      toast.error("Failed to load pages");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setDraft(newEmptyDraft());
  };

  const openCreate = () => {
    setDraft(newEmptyDraft());
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setDraft(normalizePage(p));
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, saving]);

  const onChange = (key, value) => {
    setDraft((d) => {
      const next = { ...d, [key]: value };

      if (key === "name") {
        const auto = slugify(value);
        if (!d.slug || d.slug === slugify(d.name)) {
          next.slug = auto;
        }
      }

      if (key === "type" && value !== "category") {
        next.categorySlug = "";
      }

      if (key === "type" && value !== "manual") {
        next.productIdsText = "";
      }

      return next;
    });
  };

  const validateDraft = () => {
    if (!draft.name.trim()) return "Page name is required.";
    if (!draft.slug.trim()) return "Slug is required.";

    if (draft.type === "category" && !draft.categorySlug.trim()) {
      return "Category pages must have a category selected.";
    }

    return null;
  };

  const saveDraft = async () => {
    if (saving) return;
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
        heroImage: null,
        type: draft.type,
        categorySlug: draft.type === "category" ? draft.categorySlug.trim() : null,
        productIds: draft.type === "manual" ? parseCsvIds(draft.productIdsText) : [],
        displayOrder: toNum(draft.displayOrder, 0),
        active: !!draft.active,
        showInHeader: !!draft.showInHeader,
        showInFooter: !!draft.showInFooter,
        featured: !!draft.featured,
        seoTitle: (draft.seoTitle || "").trim() || null,
        seoDescription: (draft.seoDescription || "").trim() || null,
      };

      if (draft.id) {
        await api.put(`/pages/${draft.id}`, payload);
        toast.success("Page updated");
      } else {
        await api.post(`/pages`, payload);
        toast.success("Page created");
      }

      window.dispatchEvent(new Event("storefront-navigation-updated"));
      closeModal();
      await loadPages();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to save page";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async (p) => {
    const item = normalizePage(p);
    if (!item.id) return;

    try {
      await api.put(`/pages/${item.id}`, {
        name: item.name,
        slug: item.slug,
        description: item.description,
        heroImage: null,
        type: item.type,
        categorySlug: item.type === "category" ? item.categorySlug : null,
        productIds: item.type === "manual" ? item.productIds : [],
        displayOrder: toNum(item.displayOrder, 0),
        active: !!item.active,
        showInHeader: !!item.showInHeader,
        showInFooter: !!item.showInFooter,
        featured: !item.featured,
        seoTitle: item.seoTitle || null,
        seoDescription: item.seoDescription || null,
      });

      toast.success(!item.featured ? "Marked as featured" : "Unfeatured");
      window.dispatchEvent(new Event("storefront-navigation-updated"));
      await loadPages();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update featured status");
    }
  };

  const deletePage = async (page) => {
    const item = normalizePage(page);
    if (!item.id) return;

    const ok = window.confirm(`Delete page "${item.name}"?`);
    if (!ok) return;

    try {
      await api.delete(`/pages/${item.id}`);
      toast.success("Page deleted");
      window.dispatchEvent(new Event("storefront-navigation-updated"));
      await loadPages();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to delete page";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl mb-2">Pages</h1>
          <p className="text-graphite">
            Create real storefront pages like Promotions, Bridal Edit, Best Sellers and category-driven pages.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPages}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
            disabled={loading}
            type="button"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold"
            type="button"
          >
            <Plus className="w-4 h-4" />
            New page
          </button>
        </div>
      </div>

      <div className="bg-card border-2 border-gold/20 p-4 flex items-center gap-3">
        <Search className="w-4 h-4 text-graphite" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search pages by name, slug, description, type…"
          className="w-full bg-transparent focus:outline-none font-serif"
        />
      </div>

      <section className="bg-card border-2 border-gold/20 p-6">
        <h2 className="font-serif text-2xl mb-4">All pages</h2>

        {loading ? (
          <p className="text-graphite">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="border border-gold/20 p-4 text-graphite">
            No pages found. Create one to start building real storefront routes.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <div
                key={p.id || p.slug}
                className="border border-gold/20 p-4 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-serif text-xl truncate">{p.name || "Untitled"}</h3>

                    <span className="text-xs tracking-widest uppercase border border-gold/30 px-2 py-1 text-graphite">
                      /{p.slug || "no-slug"}
                    </span>

                    <span className="text-xs tracking-widest uppercase border border-gold/20 px-2 py-1 text-graphite">
                      {p.type}
                    </span>

                    {p.featured ? (
                      <span className="text-xs tracking-widest uppercase border border-gold px-2 py-1 text-charcoal">
                        Featured
                      </span>
                    ) : null}

                    {!p.active ? (
                      <span className="text-xs tracking-widest uppercase border border-red-300 px-2 py-1 text-red-700">
                        Inactive
                      </span>
                    ) : null}
                  </div>

                  {p.description ? (
                    <p className="text-sm text-graphite mt-2 line-clamp-2">{p.description}</p>
                  ) : (
                    <p className="text-sm text-graphite mt-2 italic">No description</p>
                  )}

                  <div className="text-xs text-graphite mt-3 flex items-center gap-4 flex-wrap">
                    <span>
                      Display order: <span className="font-semibold">{toNum(p.displayOrder, 0)}</span>
                    </span>
                    {p.showInHeader ? (
                      <span>
                        Header: <span className="font-semibold">Yes</span>
                      </span>
                    ) : null}
                    {p.showInFooter ? (
                      <span>
                        Footer: <span className="font-semibold">Yes</span>
                      </span>
                    ) : null}
                    {p.categorySlug ? (
                      <span>
                        Category: <span className="font-semibold">{p.categorySlug}</span>
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleFeatured(p)}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
                    title="Toggle featured"
                    type="button"
                  >
                    {p.featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    {p.featured ? "Unfeature" : "Feature"}
                  </button>

                  <button
                    onClick={() => openEdit(p)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold"
                    type="button"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deletePage(p)}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-red-300 text-red-700 hover:bg-red-50 transition-all duration-300 text-xs tracking-widest uppercase font-bold"
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {modalOpen ? (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={closeModal} />

          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="min-h-full flex items-start justify-center p-4">
              <div
                className="w-full max-w-3xl bg-card border-2 border-gold/30 p-6 mt-6 mb-10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-2xl">
                      {draft.id ? "Edit page" : "Create page"}
                    </h2>
                    <p className="text-xs text-graphite mt-1">
                      Pages create real storefront URLs like /pages/promotions and /pages/bridal-edit.
                    </p>
                  </div>

                  <button
                    onClick={closeModal}
                    className="p-2 border border-gold/30 hover:border-gold"
                    title="Close"
                    disabled={saving}
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4">
                  <button
                    onClick={closeModal}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
                    disabled={saving}
                    type="button"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
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
                      placeholder="e.g. Promotions"
                    />
                  </div>

                  <div>
                    <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                      Slug
                    </label>
                    <input
                      value={draft.slug}
                      onChange={(e) => onChange("slug", slugify(e.target.value))}
                      className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                      placeholder="promotions"
                    />
                  </div>

                  <div>
                    <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                      Type
                    </label>
                    <select
                      value={draft.type}
                      onChange={(e) => onChange("type", e.target.value)}
                      className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                    >
                      <option value="manual">Manual</option>
                      <option value="category">Category Page</option>
                      <option value="featured">Featured Products</option>
                      <option value="new_arrivals">New Arrivals</option>
                      <option value="bestsellers">Best Sellers</option>
                      <option value="discounted">Discounted Products</option>
                    </select>
                  </div>

                  {draft.type === "category" ? (
                    <div className="md:col-span-2">
                      <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                        Linked category
                      </label>
                      <select
                        value={draft.categorySlug}
                        onChange={(e) => onChange("categorySlug", e.target.value)}
                        className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id || cat.slug} value={cat.slug}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {draft.type === "manual" ? (
                    <div className="md:col-span-2">
                      <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                        Product IDs (comma-separated)
                      </label>
                      <textarea
                        value={draft.productIdsText}
                        onChange={(e) => onChange("productIdsText", e.target.value)}
                        className="w-full px-4 py-3 border border-gold/20 focus:border-gold bg-transparent focus:ring-0 font-serif min-h-[110px]"
                        placeholder="product-id-1, product-id-2, product-id-3"
                      />
                      <p className="text-xs text-graphite mt-2">
                        Use this only for manual pages. Leave blank for auto-generated page types.
                      </p>
                    </div>
                  ) : null}

                  <div className="md:col-span-2">
                    <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                      Description
                    </label>
                    <textarea
                      value={draft.description}
                      onChange={(e) => onChange("description", e.target.value)}
                      className="w-full px-4 py-3 border border-gold/20 focus:border-gold bg-transparent focus:ring-0 font-serif min-h-[110px]"
                      placeholder="Short page description shown on the storefront page."
                    />
                  </div>

                  <div>
                    <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                      Display order
                    </label>
                    <input
                      type="number"
                      value={draft.displayOrder}
                      onChange={(e) => onChange("displayOrder", toNum(e.target.value, 0))}
                      className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="flex items-center justify-between gap-4">
                      <span className="text-xs tracking-widest uppercase font-bold text-charcoal">
                        Featured
                      </span>
                      <button
                        onClick={() => onChange("featured", !draft.featured)}
                        className={`px-4 py-2 border text-xs tracking-widest uppercase font-bold transition-all ${
                          draft.featured
                            ? "bg-charcoal text-gold border-gold"
                            : "bg-transparent text-charcoal border-gold/30 hover:border-gold"
                        }`}
                        disabled={saving}
                        type="button"
                      >
                        {draft.featured ? "Enabled" : "Disabled"}
                      </button>
                    </label>

                    <label className="flex items-center justify-between gap-4">
                      <span className="text-xs tracking-widest uppercase font-bold text-charcoal">
                        Active
                      </span>
                      <button
                        onClick={() => onChange("active", !draft.active)}
                        className={`px-4 py-2 border text-xs tracking-widest uppercase font-bold transition-all ${
                          draft.active
                            ? "bg-charcoal text-gold border-gold"
                            : "bg-transparent text-charcoal border-gold/30 hover:border-gold"
                        }`}
                        disabled={saving}
                        type="button"
                      >
                        {draft.active ? "Enabled" : "Disabled"}
                      </button>
                    </label>

                    <label className="flex items-center justify-between gap-4">
                      <span className="text-xs tracking-widest uppercase font-bold text-charcoal">
                        Show in header
                      </span>
                      <button
                        onClick={() => onChange("showInHeader", !draft.showInHeader)}
                        className={`px-4 py-2 border text-xs tracking-widest uppercase font-bold transition-all ${
                          draft.showInHeader
                            ? "bg-charcoal text-gold border-gold"
                            : "bg-transparent text-charcoal border-gold/30 hover:border-gold"
                        }`}
                        disabled={saving}
                        type="button"
                      >
                        {draft.showInHeader ? "Enabled" : "Disabled"}
                      </button>
                    </label>

                    <label className="flex items-center justify-between gap-4">
                      <span className="text-xs tracking-widest uppercase font-bold text-charcoal">
                        Show in footer
                      </span>
                      <button
                        onClick={() => onChange("showInFooter", !draft.showInFooter)}
                        className={`px-4 py-2 border text-xs tracking-widest uppercase font-bold transition-all ${
                          draft.showInFooter
                            ? "bg-charcoal text-gold border-gold"
                            : "bg-transparent text-charcoal border-gold/30 hover:border-gold"
                        }`}
                        disabled={saving}
                        type="button"
                      >
                        {draft.showInFooter ? "Enabled" : "Disabled"}
                      </button>
                    </label>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                      SEO title
                    </label>
                    <input
                      value={draft.seoTitle}
                      onChange={(e) => onChange("seoTitle", e.target.value)}
                      className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                      placeholder="Optional SEO title"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                      SEO description
                    </label>
                    <textarea
                      value={draft.seoDescription}
                      onChange={(e) => onChange("seoDescription", e.target.value)}
                      className="w-full px-4 py-3 border border-gold/20 focus:border-gold bg-transparent focus:ring-0 font-serif min-h-[90px]"
                      placeholder="Optional SEO description"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 mt-8">
                  <button
                    onClick={closeModal}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
                    disabled={saving}
                    type="button"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>

                  <button
                    onClick={saveDraft}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold disabled:opacity-50"
                    disabled={saving}
                    type="button"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>

                <p className="text-[11px] text-graphite mt-4">
                  Tip: Use type “category” to auto-build a page from a category, or “manual” for a hand-picked page.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}