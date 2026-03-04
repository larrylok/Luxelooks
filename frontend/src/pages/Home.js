// src/pages/Home.js  (FULL COPY-PASTE FILE)
// Fix: Uses shared axios client (api) so baseURL is consistent.
// api.baseURL already includes "/api", so call api.get("/products") not "/api/products".

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import { Heart, ShoppingCart, Eye, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import api from "@/api"; // ✅ use configured axios instance
import storage from "@/utils/storage";
import analytics from "@/utils/analytics";

function normalizeId(p) {
  return p?.id || p?._id || p?.productId || p?.slug;
}

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const productsRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    category: "",
    collection: "",
    search: "",
    sort: "",
  });

  const [showFilters, setShowFilters] = useState(false);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    analytics.pageView("Home");
    loadWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync filters from URL query
  useEffect(() => {
    const sp = new URLSearchParams(location.search);

    const nextFilters = {
      category: sp.get("category") || "",
      collection: sp.get("collection") || "",
      search: sp.get("search") || "",
      sort: sp.get("sort") || "",
    };

    setFilters(nextFilters);
    setPage(1);
  }, [location.search]);

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filters]);

  const scrollToProducts = () => {
    requestAnimationFrame(() => {
      productsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const loadWishlist = async () => {
    const wl = (await storage.get("wishlist")) || [];
    setWishlist(Array.isArray(wl) ? wl : []);
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        status: "active",
      };

      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.sort) params.sort = filters.sort;
      if (filters.collection) params.collection = filters.collection;

      // ✅ IMPORTANT:
      // api.baseURL already has "/api", so call "/products"
      const response = await api.get("/products", { params });

      const data = response?.data;

      // Support multiple backend shapes:
      // 1) { products: [], pages: n }
      // 2) { items: [], pages: n }
      // 3) [] (direct array)
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.products)
        ? data.products
        : Array.isArray(data?.items)
        ? data.items
        : [];

      setProducts(list);
      setTotalPages(Number(data?.pages || data?.totalPages || 1));
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
      setProducts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };

    setFilters(next);
    setPage(1);

    const params = {};
    if (next.category) params.category = next.category;
    if (next.collection) params.collection = next.collection;
    if (next.search) params.search = next.search;
    if (next.sort) params.sort = next.sort;

    setSearchParams(params);
  };

  const toggleWishlist = async (productId) => {
    const pid = String(productId || "");
    if (!pid) return;

    let newWishlist = Array.isArray(wishlist) ? [...wishlist] : [];
    const index = newWishlist.indexOf(pid);

    if (index > -1) {
      newWishlist.splice(index, 1);
      toast.success("Removed from wishlist");
    } else {
      newWishlist.push(pid);
      const product = products.find((p) => String(normalizeId(p)) === pid);
      analytics.addToWishlist(pid, product?.name);
      toast.success("Added to wishlist");
    }

    setWishlist(newWishlist);
    await storage.set("wishlist", newWishlist);
    window.dispatchEvent(new Event("storage-update"));
  };

  const addToCart = async (product) => {
    if (!product?.variants || product.variants.length === 0) {
      toast.error("Product has no variants available");
      return;
    }

    const defaultVariant = product.variants[0];

    if (Number(defaultVariant?.stock || 0) <= 0 && !product.allowPreorder) {
      toast.error("Product is out of stock");
      return;
    }

    const cart = (await storage.get("cart")) || { items: [], subtotal: 0, total: 0 };
    cart.items = Array.isArray(cart.items) ? cart.items : [];

    const pid = normalizeId(product);
    const vid = defaultVariant?.id || defaultVariant?._id;

    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId === pid && item.variantId === vid
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += 1;
    } else {
      cart.items.push({
        productId: pid,
        variantId: vid,
        quantity: 1,
        giftWrap: false,
        giftMessage: null,
        giftReceipt: false,
        isPreorder: Number(defaultVariant?.stock || 0) <= 0 && !!product.allowPreorder,
      });
    }

    await storage.set("cart", cart);
    window.dispatchEvent(new Event("storage-update"));

    analytics.addToCart(
      pid,
      product.name,
      defaultVariant,
      1,
      Number(product.salePrice || product.basePrice || 0)
    );

    toast.success("Added to cart");
  };

  const titleText =
    filters.category ||
    (filters.collection
      ? filters.collection.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : "All Jewelry");

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <div className="absolute inset-0 sunburst-gradient"></div>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1768528426138-eeeaa7f74414?w=1600')",
          }}
        ></div>
        <div className="relative h-full flex items-center justify-center text-center px-6">
          <div className="max-w-4xl animate-fade-in">
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[0.9] text-charcoal mb-6">
              LUXE LOOKS
              <br />
              <span className="text-gold">COLLECTION</span>
            </h1>
            <p className="text-lg md:text-xl text-graphite mb-8 leading-relaxed max-w-2xl mx-auto">
              Discover our curated collection of jewelry. Each piece is a masterpiece of
              geometric precision and timeless beauty.
            </p>

            <button
              onClick={() => {
                setShowFilters(false);
                setFilters({ category: "", collection: "", search: "", sort: "" });
                setPage(1);
                setSearchParams({});
                scrollToProducts();
              }}
              className="px-12 py-4 bg-charcoal text-gold border-2 border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-sm tracking-widest uppercase font-bold art-deco-button"
              type="button"
            >
              Shop Now
            </button>
          </div>
        </div>
      </section>

      {/* Filters and Products */}
      <section
        ref={productsRef}
        className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1600px] py-16"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12 pb-6 border-b border-gold/20">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl tracking-tight text-charcoal">
              {titleText}
            </h2>
            <p className="text-sm text-graphite mt-1">
              Discover our collection of luxury Art Deco pieces
            </p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gold/30 hover:border-gold transition-colors text-sm"
              type="button"
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
            </button>

            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange("sort", e.target.value)}
              className="px-4 py-2 border border-gold/30 bg-transparent text-sm focus:border-gold focus:ring-0"
            >
              <option value="">Sort By</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="mb-8 p-6 border border-gold/20 bg-secondary animate-slide-down">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold mb-3 tracking-widest uppercase text-charcoal">
                  Category
                </label>
                <div className="space-y-2">
                  {["", "Necklaces", "Earrings", "Bracelets"].map((cat) => (
                    <label key={cat} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="category"
                        checked={filters.category === cat}
                        onChange={() => handleFilterChange("category", cat)}
                        className="accent-gold"
                      />
                      <span className="text-sm">{cat || "All"}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-3 tracking-widest uppercase text-charcoal">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-4 py-2 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0"
                />
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-graphite">Loading our collection...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-serif text-2xl text-charcoal mb-2">No products found</p>
            <p className="text-graphite">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product) => {
              const pid = String(normalizeId(product) || "");
              return (
                <div
                  key={pid}
                  className="product-card bg-card border border-gold/20 hover:border-gold transition-all duration-300 group"
                >
                  <div className="relative overflow-hidden">
                    <Link to={`/products/${product.slug}`}>
                      <img
                        src={product.images?.[0]}
                        alt={product.name}
                        className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </Link>

                    <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={() => toggleWishlist(pid)}
                        className="w-10 h-10 bg-pearl border border-gold flex items-center justify-center hover:bg-gold hover:text-white transition-colors"
                        type="button"
                      >
                        <Heart size={18} fill={wishlist.includes(pid) ? "currentColor" : "none"} />
                      </button>
                      <Link
                        to={`/products/${product.slug}`}
                        className="w-10 h-10 bg-pearl border border-gold flex items-center justify-center hover:bg-gold hover:text-white transition-colors"
                      >
                        <Eye size={18} />
                      </Link>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-3">
                      <span className="text-xs tracking-widest uppercase text-graphite">
                        {product.category}
                      </span>
                    </div>

                    <Link to={`/products/${product.slug}`}>
                      <h3 className="font-serif text-xl text-charcoal mb-2 hover:text-gold transition-colors">
                        {product.name}
                      </h3>
                    </Link>

                    <p className="text-sm text-graphite mb-4 line-clamp-2">
                      {product.shortDescription}
                    </p>

                    <button
                      onClick={() => addToCart(product)}
                      className="w-full py-3 bg-transparent border border-gold text-charcoal hover:bg-charcoal hover:text-gold transition-all duration-300 text-xs tracking-widest uppercase font-bold flex items-center justify-center space-x-2"
                      type="button"
                    >
                      <ShoppingCart size={16} />
                      <span>Add to Cart</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}