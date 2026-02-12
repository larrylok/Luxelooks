import React, { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Copy, Archive, Tag, X } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [bulkAction, setBulkAction] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    shortDescription: "",
    longDescription: "",
    basePrice: 0,
    salePrice: null,
    category: "Necklaces",
    tags: "",
    images: [],
    variants: [{ size: "", color: "", material: "", stock: 0, sku: "", priceAdjustment: 0 }],
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
  }, [filterCategory]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filterCategory) params.category = filterCategory;

      const response = await axios.get(`${API}/products`, { params });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
    }
    setLoading(false);
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      slug: "",
      shortDescription: "",
      longDescription: "",
      basePrice: 0,
      salePrice: null,
      category: "Necklaces",
      tags: "",
      images: [],
      variants: [{ size: "", color: "", material: "", stock: 0, sku: "", priceAdjustment: 0 }],
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
    setShowModal(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      ...product,
      tags: product.tags.join(", "),
      salePrice: product.salePrice || null,
    });
    setShowModal(true);
  };

  const handleDuplicateProduct = (product) => {
    setEditingProduct(null);
    setFormData({
      ...product,
      name: `${product.name} (Copy)`,
      slug: `${product.slug}-copy`,
      tags: product.tags.join(", "),
    });
    setShowModal(true);
  };

  const handleSaveProduct = async () => {
    try {
      // Generate slug if empty
      if (!formData.slug) {
        formData.slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      }

      // Process tags
      const tagsArray = formData.tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => t);

      // Calculate discount percentage
      let discountPercentage = null;
      if (formData.salePrice && formData.basePrice) {
        discountPercentage = ((formData.basePrice - formData.salePrice) / formData.basePrice) * 100;
      }

      const productData = {
        ...formData,
        tags: tagsArray,
        collections: formData.collections || [],
        relatedProductIds: formData.relatedProductIds || [],
        bundleProductIds: formData.bundleProductIds || [],
        discountPercentage,
        averageRating: formData.averageRating || 0,
        reviewCount: formData.reviewCount || 0,
        viewCount: formData.viewCount || 0,
        addToCartCount: formData.addToCartCount || 0,
        totalPurchases: formData.totalPurchases || 0,
      };

      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, productData);
        toast.success("Product updated successfully");
      } else {
        await axios.post(`${API}/products`, productData);
        toast.success("Product created successfully");
      }

      setShowModal(false);
      loadProducts();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;

    try {
      await axios.delete(`${API}/products/${productId}`);
      toast.success("Product deleted successfully");
      loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedProducts.length === 0) {
      toast.error("Please select products and an action");
      return;
    }

    try {
      if (bulkAction === "delete") {
        for (const productId of selectedProducts) {
          await axios.delete(`${API}/products/${productId}`);
        }
        toast.success(`${selectedProducts.length} products deleted`);
      } else if (bulkAction === "archive") {
        for (const productId of selectedProducts) {
          await axios.put(`${API}/products/${productId}`, { status: "archived" });
        }
        toast.success(`${selectedProducts.length} products archived`);
      } else if (bulkAction === "feature") {
        for (const productId of selectedProducts) {
          await axios.put(`${API}/products/${productId}`, { isFeatured: true });
        }
        toast.success(`${selectedProducts.length} products featured`);
      } else if (bulkAction === "discount") {
        const discountPercent = prompt("Enter discount percentage (e.g., 10 for 10%):");
        if (discountPercent) {
          for (const productId of selectedProducts) {
            const product = products.find((p) => p.id === productId);
            if (product) {
              const salePrice = product.basePrice * (1 - parseFloat(discountPercent) / 100);
              await axios.put(`${API}/products/${productId}`, {
                salePrice,
                discountPercentage: parseFloat(discountPercent),
              });
            }
          }
          toast.success(`Discount applied to ${selectedProducts.length} products`);
        }
      }

      setSelectedProducts([]);
      setBulkAction("");
      loadProducts();
    } catch (error) {
      console.error("Bulk action error:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  const addVariant = () => {
    setFormData({
      ...formData,
      variants: [
        ...formData.variants,
        { size: "", color: "", material: "", stock: 0, sku: "", priceAdjustment: 0 },
      ],
    });
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = value;
    setFormData({ ...formData, variants: newVariants });
  };

  const removeVariant = (index) => {
    const newVariants = formData.variants.filter((_, i) => i !== index);
    setFormData({ ...formData, variants: newVariants });
  };

  const addImageUrl = () => {
    const url = prompt("Enter image URL:");
    if (url) {
      setFormData({ ...formData, images: [...formData.images, url] });
    }
  };

  const removeImage = (index) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData({ ...formData, images: newImages });
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        >
          <Plus size={20} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-card border border-gold/20 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-graphite" />
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
            <option value="Necklaces">Necklaces</option>
            <option value="Earrings">Earrings</option>
            <option value="Bracelets">Bracelets</option>
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
            >
              Apply Action
            </button>
          </div>
        )}
      </div>

      {/* Products Table */}
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
                      if (e.target.checked) {
                        setSelectedProducts(filteredProducts.map((p) => p.id));
                      } else {
                        setSelectedProducts([]);
                      }
                    }}
                    checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
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
                const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
                return (
                  <tr key={product.id} className="border-t border-gold/20 hover:bg-secondary/50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProducts([...selectedProducts, product.id]);
                          } else {
                            setSelectedProducts(selectedProducts.filter((id) => id !== product.id));
                          }
                        }}
                        className="accent-gold"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-16 h-16 object-cover"
                        />
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
                          <p className="text-gold font-bold">KES {product.salePrice.toLocaleString()}</p>
                          <p className="text-xs text-graphite line-through">
                            KES {product.basePrice.toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="font-bold">KES {product.basePrice.toLocaleString()}</p>
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
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDuplicateProduct(product)}
                          className="p-2 hover:bg-secondary transition-colors"
                          title="Duplicate"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 hover:bg-destructive/10 text-destructive transition-colors"
                          title="Delete"
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

      {/* Product Modal */}
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
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-secondary">
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Basic Info */}
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
                      onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                      className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      maxLength={150}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Long Description</label>
                    <textarea
                      value={formData.longDescription}
                      onChange={(e) => setFormData({ ...formData, longDescription: e.target.value })}
                      className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      rows={4}
                    />
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Base Price (KES) *</label>
                      <input
                        type="number"
                        value={formData.basePrice}
                        onChange={(e) => setFormData({ ...formData, basePrice: parseFloat(e.target.value) })}
                        className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Sale Price (KES)</label>
                      <input
                        type="number"
                        value={formData.salePrice || ""}
                        onChange={(e) =>
                          setFormData({ ...formData, salePrice: e.target.value ? parseFloat(e.target.value) : null })
                        }
                        className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Category *</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      >
                        <option value="Necklaces">Necklaces</option>
                        <option value="Earrings">Earrings</option>
                        <option value="Bracelets">Bracelets</option>
                      </select>
                    </div>
                  </div>

                  {/* Images */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold">Images</label>
                      <button
                        onClick={addImageUrl}
                        className="text-sm text-gold hover:underline"
                        type="button"
                      >
                        + Add Image URL
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      {formData.images.map((img, index) => (
                        <div key={index} className="relative">
                          <img src={img} alt={`Product ${index + 1}`} className="w-full h-24 object-cover" />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 p-1 bg-destructive text-white"
                            type="button"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Variants */}
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
                      {formData.variants.map((variant, index) => (
                        <div key={index} className="border border-gold/20 p-4">
                          <div className="grid grid-cols-6 gap-2">
                            <input
                              type="text"
                              placeholder="Color"
                              value={variant.color}
                              onChange={(e) => updateVariant(index, "color", e.target.value)}
                              className="px-2 py-1 border border-gold/30 bg-transparent text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Size"
                              value={variant.size}
                              onChange={(e) => updateVariant(index, "size", e.target.value)}
                              className="px-2 py-1 border border-gold/30 bg-transparent text-sm"
                            />
                            <input
                              type="text"
                              placeholder="Material"
                              value={variant.material}
                              onChange={(e) => updateVariant(index, "material", e.target.value)}
                              className="px-2 py-1 border border-gold/30 bg-transparent text-sm"
                            />
                            <input
                              type="number"
                              placeholder="Stock"
                              value={variant.stock}
                              onChange={(e) => updateVariant(index, "stock", parseInt(e.target.value) || 0)}
                              className="px-2 py-1 border border-gold/30 bg-transparent text-sm"
                            />
                            <input
                              type="text"
                              placeholder="SKU"
                              value={variant.sku}
                              onChange={(e) => updateVariant(index, "sku", e.target.value)}
                              className="px-2 py-1 border border-gold/30 bg-transparent text-sm"
                            />
                            <button
                              onClick={() => removeVariant(index)}
                              className="p-1 text-destructive hover:bg-destructive/10"
                              type="button"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold mb-2">Materials</label>
                      <input
                        type="text"
                        value={formData.materials}
                        onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
                        className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2">Weight</label>
                      <input
                        type="text"
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2">Tags (comma-separated)</label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                      placeholder="diamond, luxury, necklace"
                    />
                  </div>

                  {/* Flags */}
                  <div className="grid grid-cols-3 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                        className="accent-gold"
                      />
                      <span className="text-sm">Featured</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isBestseller}
                        onChange={(e) => setFormData({ ...formData, isBestseller: e.target.checked })}
                        className="accent-gold"
                      />
                      <span className="text-sm">Bestseller</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isNewArrival}
                        onChange={(e) => setFormData({ ...formData, isNewArrival: e.target.checked })}
                        className="accent-gold"
                      />
                      <span className="text-sm">New Arrival</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.allowPreorder}
                        onChange={(e) => setFormData({ ...formData, allowPreorder: e.target.checked })}
                        className="accent-gold"
                      />
                      <span className="text-sm">Allow Preorder</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.giftWrapAvailable}
                        onChange={(e) => setFormData({ ...formData, giftWrapAvailable: e.target.checked })}
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

                {/* Actions */}
                <div className="flex space-x-4 mt-8">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-gold text-charcoal hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProduct}
                    className="flex-1 py-3 bg-gold text-white hover:bg-gold/90 transition-colors"
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
