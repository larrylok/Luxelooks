
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Save,
  X,
  Search,
  RefreshCw,
  Star,
  StarOff,
  Upload,
  ArrowLeft,
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

function newEmptyDraft() {
  return {
    id: null, // normalized id here (_id or id)
    name: "",
    slug: "",
    description: "",
    heroImage: "",
    displayOrder: 0,
    featured: false,
    productIds: [],
  };
}

function normalizeCollection(c) {
  const id = c?._id || c?.id || null;
  return {
    ...c,
    id,
    name: c?.name || "",
    slug: c?.slug || "",
    description: c?.description || "",
    heroImage: c?.heroImage || "",
    displayOrder: toNum(c?.displayOrder, 0),
    featured: !!c?.featured,
    productIds: Array.isArray(c?.productIds) ? c.productIds : [],
  };
}

export default function AdminCollections() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(newEmptyDraft);

  const [uploadingHero, setUploadingHero] = useState(false);

  // ✅ Prevent stale responses overwriting latest state
  const requestSeq = useRef(0);

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
    const seq = ++requestSeq.current;
    setLoading(true);

    try {
      const res = await api.get(`/collections`);
      if (seq !== requestSeq.current) return;

      const data = Array.isArray(res.data) ? res.data : res.data?.items || [];
      const normalized = data.map(normalizeCollection);

      setItems(
        normalized
          .slice()
          .sort((a, b) => toNum(a.displayOrder, 0) - toNum(b.displayOrder, 0))
      );
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error(err);
      toast.error("Failed to load collections");
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const closeModal = () => {
    if (saving) return;
    if (uploadingHero) {
      toast.error("Please wait for the image upload to finish.");
      return;
    }
    setModalOpen(false);
    setDraft(newEmptyDraft());
  };

  const openCreate = () => {
    setDraft(newEmptyDraft());
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setDraft(normalizeCollection(c));
    setModalOpen(true);
  };

  // ✅ Lock background scroll while modal is open
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [modalOpen]);

  // ✅ ESC closes modal
  useEffect(() => {
    if (!modalOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeModal();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen, saving, uploadingHero]);

  const onChange = (key, value) => {
    setDraft((d) => {
      const next = { ...d, [key]: value };

      // auto-slug when creating or when slug is empty or auto-generated
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
    if (saving) return; // ✅ prevent double click
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
        heroImage: (draft.heroImage || "").trim() || null,
        displayOrder: toNum(draft.displayOrder, 0),
        featured: !!draft.featured,
        productIds: Array.isArray(draft.productIds) ? draft.productIds : [],
      };

      if (draft.id) {
        await api.put(`/collections/${draft.id}`, payload);
        toast.success("Collection updated");
      } else {
        await api.post(`/collections`, payload);
        toast.success("Collection created");
      }

      closeModal();
      await loadCollections();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to save collection";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const toggleFeatured = async (c) => {
    const col = normalizeCollection(c);
    if (!col.id) return;

    try {
      await api.put(`/collections/${col.id}`, {
        name: col.name,
        slug: col.slug,
        description: col.description,
        heroImage: col.heroImage?.trim() ? col.heroImage.trim() : null,
        displayOrder: toNum(col.displayOrder, 0),
        featured: !col.featured,
        productIds: Array.isArray(col.productIds) ? col.productIds : [],
      });

      toast.success(!col.featured ? "Marked as featured" : "Unfeatured");
      await loadCollections();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update featured status");
    }
  };

  const handleHeroUpload = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }

    setUploadingHero(true);
    try {
      const form = new FormData();
      form.append("file", file);

      const res = await api.post("/admin/upload-image", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const url = res?.data?.url;
      if (!url) {
        toast.error("Upload failed: no URL returned");
        return;
      }

      onChange("heroImage", url);
      toast.success("Hero image uploaded");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Image upload failed";
      toast.error(msg);
    } finally {
      setUploadingHero(false);
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
                key={c.id || c.slug}
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
                  </div>

                  {c.description ? (
                    <p className="text-sm text-graphite mt-2 line-clamp-2">{c.description}</p>
                  ) : (
                    <p className="text-sm text-graphite mt-2 italic">No description</p>
                  )}

                  <div className="text-xs text-graphite mt-3 flex items-center gap-4">
                    <span>
                      Display order: <span className="font-semibold">{toNum(c.displayOrder, 0)}</span>
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
                    type="button"
                  >
                    {c.featured ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
                    {c.featured ? "Unfeature" : "Feature"}
                  </button>

                  <button
                    onClick={() => openEdit(c)}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold"
                    type="button"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ✅ Modal (scrollable + overlay closable) */}
      {modalOpen ? (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-50 bg-black/50" onClick={closeModal} />

          {/* Scroll container */}
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="min-h-full flex items-start justify-center p-4">
              <div
                className="w-full max-w-2xl bg-card border-2 border-gold/30 p-6 mt-6 mb-10"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-serif text-2xl">
                      {draft.id ? "Edit collection" : "Create collection"}
                    </h2>
                    <p className="text-xs text-graphite mt-1">
                      This controls how collections appear on the storefront.
                    </p>
                  </div>

                  <button
                    onClick={closeModal}
                    className="p-2 border border-gold/30 hover:border-gold"
                    title="Close"
                    disabled={saving || uploadingHero}
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* ✅ Back button */}
                <div className="mt-4">
                  <button
                    onClick={closeModal}
                    className="inline-flex items-center gap-2 px-3 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
                    disabled={saving || uploadingHero}
                    type="button"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                </div>

                {/* Body */}
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

                  {/* Hero image */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs tracking-widest uppercase font-bold text-charcoal">
                        Hero image
                      </label>

                      <label
                        className={`inline-flex items-center gap-2 text-xs tracking-widest uppercase font-bold ${
                          uploadingHero
                            ? "text-graphite cursor-not-allowed"
                            : "text-gold hover:underline cursor-pointer"
                        }`}
                        title="Upload hero image"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingHero ? "Uploading…" : "Upload image"}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingHero || saving}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            await handleHeroUpload(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    {draft.heroImage ? (
                      <div className="relative border border-gold/20 bg-black/5">
                        <img
                          src={draft.heroImage}
                          alt="Hero preview"
                          className="w-full h-48 md:h-56 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => onChange("heroImage", "")}
                          className="absolute top-2 right-2 px-3 py-2 bg-charcoal text-gold border border-gold/30 hover:bg-charcoal/90 text-xs tracking-widest uppercase font-bold"
                          disabled={saving || uploadingHero}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="w-full h-48 md:h-56 border border-gold/20 bg-black/5 flex items-center justify-center text-sm text-graphite">
                        No hero image uploaded
                      </div>
                    )}

                    <div className="mt-3">
                      <label className="block text-xs tracking-widest uppercase font-bold text-charcoal mb-2">
                        Or paste image URL (optional)
                      </label>
                      <input
                        value={draft.heroImage || ""}
                        onChange={(e) => onChange("heroImage", e.target.value)}
                        className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 font-serif"
                        placeholder="/uploads/your-image.png  (or https://...)"
                        disabled={uploadingHero}
                      />
                    </div>
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
                      disabled={saving || uploadingHero}
                      type="button"
                    >
                      {draft.featured ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-8">
                  <button
                    onClick={closeModal}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-gold/30 hover:border-gold bg-card text-charcoal text-xs tracking-widest uppercase"
                    disabled={saving || uploadingHero}
                    type="button"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>

                  <button
                    onClick={saveDraft}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold disabled:opacity-50"
                    disabled={saving || uploadingHero}
                    type="button"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>

                <p className="text-[11px] text-graphite mt-4">
                  Tip: Click outside, press ESC, or use Back/Cancel to close without saving.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}