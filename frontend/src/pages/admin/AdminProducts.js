import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Edit, Trash2, Copy as CopyIcon, X } from "lucide-react";
import { toast } from "sonner";
import api from "../../api";

function safeArr(x) {
  return Array.isArray(x) ? x : [];
}

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function safeStr(x) {
  return String(x ?? "").trim();
}

function normalizeId(p) {
  return p?.id || p?._id || p?.productId || p?.slug;
}

// Converts "/uploads/xxx.jpg" => "http://127.0.0.1:8000/uploads/xxx.jpg" (dev)
// Leaves absolute URLs (http/https) unchanged
function getApiOrigin() {
  const base = String(api?.defaults?.baseURL || "");
  return base.replace(/\/api\/?$/, "");
}

function absolutizeMaybe(url) {
  const u = String(url || "");
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const origin = getApiOrigin();
  return origin ? `${origin}${u}` : u;
}

function slugify(name) {
  return safeStr(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function ensureVariantId(v) {
  const id = safeStr(v?.id);
  if (id) return id;
  return `v_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [bulkAction, setBulkAction] = useState("");
  const [storefrontNav, setStorefrontNav] = useState({ categories: [], collections: [] });

  const fileInputRef = useRef(null);
  const [uploadingImages, setUploadingImages] = useState(false);

  const EMPTY_VARIANT = {
    id: "",
    size: "",
    color: "",
    material: "",
    stock: 0,
    sku: "",
    priceAdjustment: 0,
  };

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    shortDescription: "",
    longDescription: "",
    basePrice: 0,
    salePrice: null,
    category: "",
    collections: [],
    tags: "",
    images: [],
    primaryImage: "",
    modelImage: "",
    variants: [{ ...EMPTY_VARIANT, id: ensureVariantId({}) }],
    status: "active",
    isFeatured: false,
    isBestseller: false,
    isNewArrival: false,
    allowPreorder: false,
    giftWrapAvailable: true,
    giftWrapCost: 500,
    materials: "",
    weight: "",
    dimensions: "",
    careInstructions: "",
  });

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory]);

  useEffect(() => {
    loadStorefrontNav();
  }, []);

  const loadStorefrontNav = async () => {
    try {
      const response = await api.get("/storefront/navigation");
      setStorefrontNav({
        categories: Array.isArray(response.data?.categories) ? response.data.categories : [],
        collections: Array.isArray(response.data?.collections) ? response.data.collections : [],
      });
    } catch (error) {
      console.error("Error loading storefront navigation:", error);
      setStorefrontNav({ categories: [], collections: [] });
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 100 };
      if (filterCategory) params.category = filterCategory;

      const response = await api.get("/products", { params });
      const list = Array.isArray(response.data?.products)
        ? response.data.products
        : Array.isArray(response.data)
        ? response.data
        : [];

      setProducts(list);
    } catch (error) {
      console.error("Error loading products:", error);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to load products";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      shortDescription: "",
      longDescription: "",
      basePrice: 0,
      salePrice: null,
      category: "",
      collections: [],
      tags: "",
      images: [],
      primaryImage: "",
      modelImage: "",
      variants: [{ ...EMPTY_VARIANT, id: ensureVariantId({}) }],
      status: "active",
      isFeatured: false,
      isBestseller: false,
      isNewArrival: false,
      allowPreorder: false,
      giftWrapAvailable: true,
      giftWrapCost: 500,
      materials: "",
      weight: "",
      dimensions: "",
      careInstructions: "",
    });
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    resetForm();
    setShowModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);

    const variants = safeArr(product?.variants).length
      ? safeArr(product?.variants).map((v) => ({
          ...EMPTY_VARIANT,
          ...v,
          id: ensureVariantId(v),
          stock: safeNum(v?.stock, 0),
          priceAdjustment: safeNum(v?.priceAdjustment, 0),
          sku: safeStr(v?.sku),
        }))
      : [{ ...EMPTY_VARIANT, id: ensureVariantId({}) }];

    const images = safeArr(product?.images);
    const primary = safeStr(product?.primaryImage) || images[0] || "";
    const model = safeStr(product?.modelImage) || "";

    setFormData({
      ...product,
      category: safeStr(product?.category),
      collections: safeArr(product?.collections),
      tags: safeArr(product?.tags).join(", "),
      images,
      primaryImage: primary,
      modelImage: model,
      variants,
      salePrice: product?.salePrice ?? null,
      basePrice: safeNum(product?.basePrice, 0),
      giftWrapCost: safeNum(product?.giftWrapCost, 500),
      materials: safeStr(product?.materials),
      weight: safeStr(product?.weight),
      dimensions: safeStr(product?.dimensions),
      careInstructions: safeStr(product?.careInstructions),
    });

    setShowModal(true);
  };

  const handleDuplicateProduct = (product) => {
    setEditingProduct(null);

    const variants = safeArr(product?.variants).length
      ? safeArr(product?.variants).map((v) => ({
          ...EMPTY_VARIANT,
          ...v,
          id: ensureVariantId({}),
          stock: safeNum(v?.stock, 0),
          priceAdjustment: safeNum(v?.priceAdjustment, 0),
          sku: safeStr(v?.sku) ? `${safeStr(v?.sku)}-COPY` : "",
        }))
      : [{ ...EMPTY_VARIANT, id: ensureVariantId({}) }];

    const images = safeArr(product?.images);
    const primary = safeStr(product?.primaryImage) || images[0] || "";

    setFormData({
      ...product,
      name: `${product.name} (Copy)`,
      slug: `${safeStr(product.slug || "product")}-copy`,
      category: safeStr(product?.category),
      collections: safeArr(product?.collections),
      tags: safeArr(product?.tags).join(", "),
      images,
      primaryImage: primary,
      modelImage: "",
      variants,
      salePrice: product?.salePrice ?? null,
      status: "draft",
      materials: safeStr(product?.materials),
      weight: safeStr(product?.weight),
      dimensions: safeStr(product?.dimensions),
      careInstructions: safeStr(product?.careInstructions),
    });

    setShowModal(true);
  };

  const handleSaveProduct = async () => {
    try {
      const name = safeStr(formData.name);
      if (!name) {
        toast.error("Product name is required");
        return;
      }

      if (!safeStr(formData.category)) {
        toast.error("Category is required");
        return;
      }

      const slug = safeStr(formData.slug) || slugify(name);

      const tagsArray = safeStr(formData.tags)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const basePrice = safeNum(formData.basePrice, 0);
      const salePrice =
        formData.salePrice === null || formData.salePrice === ""
          ? null
          : safeNum(formData.salePrice, 0);

      let discountPercentage = null;
      if (salePrice !== null && basePrice > 0) {
        discountPercentage = ((basePrice - salePrice) / basePrice) * 100;
      }

      const variantsClean = safeArr(formData.variants).map((v) => ({
        ...EMPTY_VARIANT,
        ...v,
        id: ensureVariantId(v),
        size: safeStr(v?.size) || null,
        color: safeStr(v?.color) || null,
        material: safeStr(v?.material) || null,
        stock: safeNum(v?.stock, 0),
        sku: safeStr(v?.sku),
        priceAdjustment: safeNum(v?.priceAdjustment, 0),
      }));

      const missingSku = variantsClean.some((v) => !v.sku);
      if (missingSku) {
        toast.error("Each variant must have an SKU");
        return;
      }

      const images = safeArr(formData.images);
      const primaryImage = safeStr(formData.primaryImage) || "";
      const modelImage = safeStr(formData.modelImage) || "";

      const primaryOk = !primaryImage || images.includes(primaryImage);
      const modelOk = !modelImage || images.includes(modelImage);

      const productData = {
        ...formData,
        name,
        slug,
        category: safeStr(formData.category),
        basePrice,
        salePrice,
        tags: tagsArray,
        images,
        primaryImage: primaryOk ? primaryImage : "",
        modelImage: modelOk ? modelImage : "",
        variants: variantsClean,
        collections: safeArr(formData.collections),
        relatedProductIds: safeArr(formData.relatedProductIds),
        bundleProductIds: safeArr(formData.bundleProductIds),
        discountPercentage,
        averageRating: safeNum(formData.averageRating, 0),
        reviewCount: safeNum(formData.reviewCount, 0),
        viewCount: safeNum(formData.viewCount, 0),
        addToCartCount: safeNum(formData.addToCartCount, 0),
        totalPurchases: safeNum(formData.totalPurchases, 0),
        giftWrapCost: safeNum(formData.giftWrapCost, 500),
      };

      if (editingProduct) {
        await api.put(`/products/${normalizeId(editingProduct)}`, productData);
        toast.success("Product updated successfully");
      } else {
        await api.post(`/products`, productData);
        toast.success("Product created successfully");
      }

      setShowModal(false);
      await loadProducts();
      await loadStorefrontNav();
    } catch (error) {
      console.error("Error saving product:", error);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to save product";
      toast.error(msg);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await api.delete(`/products/${productId}`);
      toast.success("Product deleted successfully");
      await loadProducts();
      await loadStorefrontNav();
    } catch (error) {
      console.error("Error deleting product:", error);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to delete product";
      toast.error(msg);
    }
  };

  const updateProductByMerging = async (productId, patch) => {
    const current = products.find((p) => normalizeId(p) === productId);
    if (!current) return;

    const merged = { ...current, ...patch };

    merged.images = safeArr(merged.images);
    merged.tags = safeArr(merged.tags);
    merged.variants = safeArr(merged.variants);
    merged.collections = safeArr(merged.collections);

    if (merged.primaryImage && !merged.images.includes(merged.primaryImage)) merged.primaryImage = "";
    if (merged.modelImage && !merged.images.includes(merged.modelImage)) merged.modelImage = "";

    merged.basePrice = safeNum(merged.basePrice, 0);
    merged.salePrice =
      merged.salePrice === null ? null : safeNum(merged.salePrice, merged.salePrice);

    await api.put(`/products/${productId}`, merged);
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedProducts.length === 0) {
      toast.error("Please select products and an action");
      return;
    }

    try {
      if (bulkAction === "delete") {
        for (const productId of selectedProducts) {
          await api.delete(`/products/${productId}`);
        }
        toast.success(`${selectedProducts.length} products deleted`);
      } else if (bulkAction === "archive") {
        for (const productId of selectedProducts) {
          await updateProductByMerging(productId, { status: "archived" });
        }
        toast.success(`${selectedProducts.length} products archived`);
      } else if (bulkAction === "feature") {
        for (const productId of selectedProducts) {
          await updateProductByMerging(productId, { isFeatured: true });
        }
        toast.success(`${selectedProducts.length} products featured`);
      } else if (bulkAction === "discount") {
        const discountPercentRaw = prompt("Enter discount percentage (e.g., 10 for 10%):");
        const discountPercent = safeNum(discountPercentRaw, NaN);

        if (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100) {
          toast.error("Invalid discount percentage");
          return;
        }

        for (const productId of selectedProducts) {
          const product = products.find((p) => normalizeId(p) === productId);
          if (!product) continue;

          const base = safeNum(product.basePrice, 0);
          if (base <= 0) continue;

          const newSalePrice = base * (1 - discountPercent / 100);

          await updateProductByMerging(productId, {
            salePrice: newSalePrice,
            discountPercentage: discountPercent,
          });
        }

        toast.success(`Discount applied to ${selectedProducts.length} products`);
      }

      setSelectedProducts([]);
      setBulkAction("");
      await loadProducts();
      await loadStorefrontNav();
    } catch (error) {
      console.error("Bulk action error:", error);
      const msg =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Failed to perform bulk action";
      toast.error(msg);
    }
  };

  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [...safeArr(formData.variants), { ...EMPTY_VARIANT, id: ensureVariantId({}) }],
    });
  };

  const updateVariant = (index, field, value) => {
    const variants = safeArr(formData.variants);
    const newVariants = [...variants];
    newVariants[index] = { ...(newVariants[index] || {}), [field]: value };
    setFormData({ ...formData, variants: newVariants });
  };

  const removeVariant = (index) => {
    const newVariants = safeArr(formData.variants).filter((_, i) => i !== index);
    setFormData({
      ...formData,
      variants: newVariants.length ? newVariants : [{ ...EMPTY_VARIANT, id: ensureVariantId({}) }],
    });
  };

  const handleChooseImages = () => {
    if (uploadingImages) return;
    fileInputRef.current?.click();
  };

  const handleUploadImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const tooBig = files.find((f) => f.size > 8 * 1024 * 1024);
    if (tooBig) {
      toast.error("One of the images is larger than 8MB. Please upload a smaller image.");
      return;
    }

    setUploadingImages(true);
    try {
      const uploaded = [];

      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);

        const res = await api.post("/admin/upload-image", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const url = res?.data?.url;
        if (url) uploaded.push(absolutizeMaybe(url));
      }

      if (!uploaded.length) {
        toast.error("Upload failed: no image URL returned.");
        return;
      }

      setFormData((prev) => {
        const nextImages = [...safeArr(prev.images), ...uploaded];
        const nextPrimary = safeStr(prev.primaryImage) || (nextImages[0] || "");
        return {
          ...prev,
          images: nextImages,
          primaryImage: nextPrimary,
        };
      });

      toast.success(`Uploaded ${uploaded.length} image(s)`);
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Failed to upload image";
      toast.error(msg);
    } finally {
      setUploadingImages(false);
    }
  };

  const setPrimaryImage = (img) => {
    const u = String(img || "");
    if (!u) return;
    setFormData((prev) => ({ ...prev, primaryImage: u }));
  };

  const setModelImage = (img) => {
    const u = String(img || "");
    if (!u) return;
    setFormData((prev) => ({ ...prev, modelImage: u }));
  };

  const removeImage = (index) => {
    const currentImages = safeArr(formData.images);
    const removed = currentImages[index];
    const newImages = currentImages.filter((_, i) => i !== index);

    setFormData((prev) => {
      let nextPrimary = safeStr(prev.primaryImage);
      let nextModel = safeStr(prev.modelImage);

      if (removed && nextPrimary === removed) nextPrimary = "";
      if (removed && nextModel === removed) nextModel = "";

      if (!nextPrimary && newImages.length) nextPrimary = newImages[0];
      if (nextModel && !newImages.includes(nextModel)) nextModel = "";

      return { ...prev, images: newImages, primaryImage: nextPrimary, modelImage: nextModel };
    });
  };

  const filteredProducts = products.filter((product) =>
    safeStr(product?.name).toLowerCase().includes(safeStr(searchTerm).toLowerCase())
  );

  const categoryOptions = Array.from(
    new Set(
      [
        ...storefrontNav.categories.map((c) => safeStr(c.name)),
        ...products.map((p) => safeStr(p.category)),
      ].filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const collectionOptions = storefrontNav.collections;

  const filteredIds = filteredProducts.map((p) => normalizeId(p)).filter(Boolean);
  const allSelected =
    filteredIds.length > 0 &&
    filteredIds.every((id) => selectedProducts.includes(id)) &&
    selectedProducts.length === filteredIds.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-4xl text-charcoal mb-2">Products</h1>
          <p className="text-graphite">{products.length} total products</p>
        </div>
        <button
          onClick={handleCreateProduct}
          className="flex items-center space-x-2 px-6 py-3 bg-gold text-white hover:bg-gold/90 transition-colors"
          data-testid="create-product-button"
          type="button"
        >
          <Plus size={20} />
          <span>Add Product</span>
        </button>
      </div>

      <div className="bg-card border border-gold/20 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-graphite"
              />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
              />
            </div>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="px-4 py-3 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
            disabled={selectedProducts.length === 0}
          >
            <option value="">Bulk Actions</option>
            <option value="delete">Delete Selected</option>
            <option value="archive">Archive Selected</option>
            <option value="feature">Feature Selected</option>
            <option value="discount">Apply Discount</option>
          </select>
        </div>

        {selectedProducts.length > 0 && (
          <div className="mt-4 flex items-center justify-between bg-secondary p-3">
            <span className="text-sm">{selectedProducts.length} products selected</span>
            <button
              onClick={handleBulkAction}
              className="px-4 py-2 bg-gold text-white text-sm hover:bg-gold/90"
              type="button"
            >
              Apply Action
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-card border border-gold/20 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-charcoal text-ivory">
              <tr>
                <th className="p-4 text-left">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) setSelectedProducts(filteredIds);
                      else setSelectedProducts([]);
                    }}
                    checked={allSelected}
                    className="accent-gold"
                  />
                </th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Product</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Category</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Price</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Stock</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Status</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.map((product) => {
                const pid = normalizeId(product);
                const variants = safeArr(product?.variants);
                const totalStock = variants.reduce((sum, v) => sum + safeNum(v?.stock, 0), 0);

                const img =
                  safeStr(product?.primaryImage) ||
                  (Array.isArray(product?.images) && product.images.length ? product.images[0] : "");

                return (
                  <tr key={pid} className="border-t border-gold/20 hover:bg-secondary/50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(pid)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts([...selectedProducts, pid]);
                          } else {
                            setSelectedProducts(selectedProducts.filter((id) => id !== pid));
                          }
                        }}
                        className="accent-gold"
                      />
                    </td>

                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        {img ? (
                          <img
                            src={absolutizeMaybe(img)}
                            alt={product.name}
                            className="w-16 h-16 object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 border border-gold/20 bg-black/5" />
                        )}
                        <div>
                          <p className="font-bold text-charcoal">{product.name}</p>
                          <p className="text-xs text-graphite">{product.slug}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-sm">{product.category}</td>

                    <td className="p-4">
                      {product.salePrice ? (
                        <div>
                          <p className="text-gold font-bold">
                            KES {safeNum(product.salePrice, 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-graphite line-through">
                            KES {safeNum(product.basePrice, 0).toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="font-bold">
                          KES {safeNum(product.basePrice, 0).toLocaleString()}
                        </p>
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2 py-1 text-xs ${
                          totalStock === 0
                            ? "bg-destructive/20 text-destructive"
                            : totalStock < 5
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {totalStock} in stock
                      </span>
                    </td>

                    <td className="p-4">
                      <span
                        className={`px-2 py-1 text-xs tracking-widest uppercase ${
                          product.status === "active"
                            ? "bg-green-100 text-green-800"
                            : product.status === "draft"
                            ? "bg-secondary text-charcoal"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="p-2 hover:bg-secondary transition-colors"
                          title="Edit"
                          type="button"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDuplicateProduct(product)}
                          className="p-2 hover:bg-secondary transition-colors"
                          title="Duplicate"
                          type="button"
                        >
                          <CopyIcon size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(pid)}
                          className="p-2 hover:bg-destructive/10 text-destructive transition-colors"
                          title="Delete"
                          type="button"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <>
          <div className="fixed inset-0 bg-charcoal/60 z-50" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="min-h-screen px-4 flex items-center justify-center">
              <div className="bg-card border-2 border-gold p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-3xl text-charcoal">
                    {editingProduct ? "Edit Product" : "Create Product"}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-secondary"
                    type="button"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Product Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Slug</label>
                      <input
                        type="text"
                        value={formData.slug}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Short Description</label>
                    <input
                      type="text"
                      value={formData.shortDescription}
                      onChange={(e) =>
                        setFormData({ ...formData, shortDescription: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      maxLength={150}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Long Description</label>
                    <textarea
                      value={formData.longDescription}
                      onChange={(e) =>
                        setFormData({ ...formData, longDescription: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Base Price (KES) *</label>
                      <input
                        type="number"
                        value={formData.basePrice}
                        onChange={(e) =>
                          setFormData({ ...formData, basePrice: safeNum(e.target.value, 0) })
                        }
                        className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Sale Price (KES)</label>
                      <input
                        type="number"
                        value={formData.salePrice ?? ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            salePrice: e.target.value ? safeNum(e.target.value, 0) : null,
                          })
                        }
                        className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Category *</label>
                      <input
                        type="text"
                        list="product-category-options"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="e.g. Rings, Necklaces, Earrings, Bracelets"
                        className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      />
                      <datalist id="product-category-options">
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-3">Collections / Storefront Pages</label>

                    {collectionOptions.length === 0 ? (
                      <p className="text-sm text-graphite">
                        No collections created yet. Create them first in Admin → Collections.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {collectionOptions.map((collection) => {
                          const checked = safeArr(formData.collections).includes(collection.slug);

                          return (
                            <label
                              key={collection.slug}
                              className="flex items-center gap-3 border border-gold/20 p-3 cursor-pointer hover:border-gold transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  const current = safeArr(formData.collections);

                                  const next = e.target.checked
                                    ? Array.from(new Set([...current, collection.slug]))
                                    : current.filter((slug) => slug !== collection.slug);

                                  setFormData({ ...formData, collections: next });
                                }}
                                className="accent-gold"
                              />

                              <div>
                                <div className="font-medium text-charcoal">{collection.name}</div>
                                <div className="text-xs text-graphite">{collection.slug}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold">Images</label>

                      <div className="flex items-center gap-3">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleUploadImages}
                          className="hidden"
                        />
                        <button
                          onClick={handleChooseImages}
                          className="text-sm text-gold hover:underline disabled:opacity-50"
                          type="button"
                          disabled={uploadingImages}
                        >
                          {uploadingImages ? "Uploading..." : "+ Upload Images"}
                        </button>
                        <span className="text-xs text-graphite">JPG/PNG/WebP up to 8MB</span>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-xs tracking-widest uppercase font-bold text-graphite mb-2">
                          Default image (storefront)
                        </label>
                        <select
                          value={formData.primaryImage || ""}
                          onChange={(e) =>
                            setFormData({ ...formData, primaryImage: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                        >
                          <option value="">Auto (first image)</option>
                          {safeArr(formData.images).map((img, i) => (
                            <option key={`${img}-${i}`} value={img}>
                              Image #{i + 1}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs tracking-widest uppercase font-bold text-graphite mb-2">
                          Model image (hover)
                        </label>
                        <select
                          value={formData.modelImage || ""}
                          onChange={(e) => setFormData({ ...formData, modelImage: e.target.value })}
                          className="w-full px-3 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                        >
                          <option value="">None</option>
                          {safeArr(formData.images).map((img, i) => (
                            <option key={`${img}-${i}`} value={img}>
                              Image #{i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      {safeArr(formData.images).map((img, index) => {
                        const isPrimary = safeStr(formData.primaryImage) === img;
                        const isModel = safeStr(formData.modelImage) === img;

                        return (
                          <div key={index} className="relative">
                            <img
                              src={absolutizeMaybe(img)}
                              alt={`Product ${index + 1}`}
                              className="w-full h-24 object-cover"
                            />

                            <div className="absolute bottom-1 left-1 flex gap-1">
                              {isPrimary ? (
                                <span className="text-[10px] px-2 py-1 bg-gold text-white tracking-widest uppercase">
                                  default
                                </span>
                              ) : null}
                              {isModel ? (
                                <span className="text-[10px] px-2 py-1 bg-secondary text-charcoal tracking-widest uppercase">
                                  model
                                </span>
                              ) : null}
                            </div>

                            <div className="absolute top-1 left-1 flex gap-1">
                              <button
                                onClick={() => setPrimaryImage(img)}
                                className="text-[10px] px-2 py-1 bg-black/70 text-white hover:bg-black/80 tracking-widest uppercase"
                                type="button"
                                title="Set as default image"
                              >
                                Default
                              </button>
                              <button
                                onClick={() => setModelImage(img)}
                                className="text-[10px] px-2 py-1 bg-black/70 text-white hover:bg-black/80 tracking-widest uppercase"
                                type="button"
                                title="Set as model hover image"
                              >
                                Model
                              </button>
                            </div>

                            <button
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 p-1 bg-destructive text-white"
                              type="button"
                              title="Remove image"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <p className="text-xs text-graphite mt-2">
                      Tip: Set <b>Default</b> to the product-only shot, and <b>Model</b> to the
                      on-body shot.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold">Variants</label>
                      <button
                        onClick={addVariant}
                        className="text-sm text-gold hover:underline"
                        type="button"
                      >
                        + Add Variant
                      </button>
                    </div>

                    <div className="space-y-3">
                      {safeArr(formData.variants).map((variant, index) => (
                        <div key={variant.id || index} className="border border-gold/20 p-4">
                          <div className="grid grid-cols-6 gap-2">
                            <input
                              type="text"
                              placeholder="Color"
                              value={variant.color || ""}
                              onChange={(e) => updateVariant(index, "color", e.target.value)}
                              className="px-2 py-1 border border-gold/30 bg-transparent text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Size"
                              value={variant.size || ""}
                              onChange={(e) => updateVariant(index, "size", e.target.value)}
                              className="px-2 py-1 border border-gold/30 bg-transparent text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Material"
                              value={variant.material || ""}
                              onChange={(e) => updateVariant(index, "material", e.target.value)}
                              className="px-2 py-1 border border-gold/30 bg-transparent text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Stock"
                              value={safeNum(variant.stock, 0)}
                              onChange={(e) =>
                                updateVariant(index, "stock", parseInt(e.target.value, 10) || 0)
                              }
                              className="px-2 py-1 border border-gold/30 bg-transparent text-sm"
                            />
                            <input
                              type="text"
                              placeholder="SKU"
                              value={variant.sku || ""}
                              onChange={(e) => updateVariant(index, "sku", e.target.value)}
                              className="px-2 py-1 border border-gold/30 bg-transparent text-sm"
                            />
                            <button
                              onClick={() => removeVariant(index)}
                              className="p-1 text-destructive hover:bg-destructive/10"
                              type="button"
                              title="Remove variant"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <input
                              type="number"
                              placeholder="Price Adjustment"
                              value={safeNum(variant.priceAdjustment, 0)}
                              onChange={(e) =>
                                updateVariant(index, "priceAdjustment", safeNum(e.target.value, 0))
                              }
                              className="px-2 py-1 border border-gold/30 bg-transparent text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Variant ID (auto)"
                              value={variant.id || ""}
                              onChange={(e) => updateVariant(index, "id", e.target.value)}
                              className="px-2 py-1 border border-gold/10 bg-black/5 text-sm"
                            />
                            <div className="text-xs text-graphite flex items-center">
                              Tip: keep SKU unique per variant
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Materials</label>
                      <input
                        type="text"
                        value={formData.materials || ""}
                        onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                        className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Weight</label>
                      <input
                        type="text"
                        value={formData.weight || ""}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.tags || ""}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      placeholder="diamond, luxury, necklace"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!formData.isFeatured}
                        onChange={(e) =>
                          setFormData({ ...formData, isFeatured: e.target.checked })
                        }
                        className="accent-gold"
                      />
                      <span className="text-sm">Featured</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!formData.isBestseller}
                        onChange={(e) =>
                          setFormData({ ...formData, isBestseller: e.target.checked })
                        }
                        className="accent-gold"
                      />
                      <span className="text-sm">Bestseller</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!formData.isNewArrival}
                        onChange={(e) =>
                          setFormData({ ...formData, isNewArrival: e.target.checked })
                        }
                        className="accent-gold"
                      />
                      <span className="text-sm">New Arrival</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!formData.allowPreorder}
                        onChange={(e) =>
                          setFormData({ ...formData, allowPreorder: e.target.checked })
                        }
                        className="accent-gold"
                      />
                      <span className="text-sm">Allow Preorder</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={!!formData.giftWrapAvailable}
                        onChange={(e) =>
                          setFormData({ ...formData, giftWrapAvailable: e.target.checked })
                        }
                        className="accent-gold"
                      />
                      <span className="text-sm">Gift Wrap Available</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-4 mt-8">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-gold text-charcoal hover:bg-secondary transition-colors"
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProduct}
                    className="flex-1 py-3 bg-gold text-white hover:bg-gold/90 transition-colors"
                    type="button"
                  >
                    {editingProduct ? "Update Product" : "Create Product"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}