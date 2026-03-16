import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation, useSearchParams, Link } from "react-router-dom";
import { Heart, ShoppingCart, Eye, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";

import api from "@/api";
import storage from "@/utils/storage";
import analytics from "@/utils/analytics";

function normalizeId(p) {
  return p?.id || p?._id || p?.productId || p?.slug;
}

function safeStr(x) {
  return String(x ?? "").trim();
}

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

function pickDefaultImage(product) {
  const primary = safeStr(product?.primaryImage);
  if (primary) return primary;

  const imgs = Array.isArray(product?.images) ? product.images : [];
  return imgs[0] || "";
}

function pickHoverImage(product) {
  const model = safeStr(product?.modelImage);
  if (model) return model;

  const imgs = Array.isArray(product?.images) ? product.images : [];
  return imgs[1] || "";
}

export default function StorefrontPage() {
  const { slug } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const productsRef = useRef(null);

  const isCategoryRoute = location.pathname.startsWith("/categories/");
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState(null);
  const [products, setProducts] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    sort: searchParams.get("sort") || "",
  });

  useEffect(() => {
    loadWishlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    analytics.pageView(isCategoryRoute ? `Category:${slug}` : `Page:${slug}`);
    loadStorefrontPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, location.pathname]);

  useEffect(() => {
    const next = {
      search: searchParams.get("search") || "",
      sort: searchParams.get("sort") || "",
    };
    setFilters(next);
  }, [searchParams]);

  const loadWishlist = async () => {
    const wl = (await storage.get("wishlist")) || [];
    setWishlist(Array.isArray(wl) ? wl : []);
  };

  const loadStorefrontPage = async () => {
    setLoading(true);
    try {
      const endpoint = isCategoryRoute
        ? `/storefront/categories/${slug}`
        : `/storefront/pages/${slug}`;

      const response = await api.get(endpoint);
      const data = response?.data || {};

      const entity = data.page || data.category || null;
      const items = Array.isArray(data.products) ? data.products : [];

      setPageData(entity);
      setProducts(items);
    } catch (error) {
      console.error("Error loading storefront page:", error);
      toast.error("Failed to load page");
      setPageData(null);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);

    const params = {};
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

  const filteredProducts = useMemo(() => {
    let list = Array.isArray(products) ? [...products] : [];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((product) => {
        return (
          safeStr(product?.name).toLowerCase().includes(q) ||
          safeStr(product?.shortDescription).toLowerCase().includes(q) ||
          safeStr(product?.longDescription).toLowerCase().includes(q) ||
          safeStr(product?.category).toLowerCase().includes(q)
        );
      });
    }

    if (filters.sort === "price_asc") {
      list.sort(
        (a, b) =>
          Number(a?.salePrice || a?.basePrice || 0) -
          Number(b?.salePrice || b?.basePrice || 0)
      );
    } else if (filters.sort === "price_desc") {
      list.sort(
        (a, b) =>
          Number(b?.salePrice || b?.basePrice || 0) -
          Number(a?.salePrice || a?.basePrice || 0)
      );
    } else if (filters.sort === "name") {
      list.sort((a, b) => safeStr(a?.name).localeCompare(safeStr(b?.name)));
    }

    return list;
  }, [products, filters]);

  const titleText = safeStr(pageData?.name) || (isCategoryRoute ? "Category" : "Collection");

  const descriptionText =
    safeStr(pageData?.description) ||
    "Discover our curated collection of luxury Art Deco pieces.";

  return (
    <div className="min-h-screen">
      <section
        ref={productsRef}
        className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1600px] py-16"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12 pb-6 border-b border-gold/20">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl tracking-tight text-charcoal">
              {titleText}
            </h1>
            <p className="text-sm text-graphite mt-2 max-w-2xl">
              {descriptionText}
            </p>
            <p className="text-sm text-graphite mt-2">
              {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"} available
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFilters({ search: "", sort: "" });
                    setSearchParams({});
                  }}
                  className="px-5 py-2 border border-gold/30 hover:border-gold transition-colors text-sm"
                  type="button"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-graphite">Loading page...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-serif text-2xl text-charcoal mb-2">No products found</p>
            <p className="text-graphite">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map((product) => {
              const pid = String(normalizeId(product) || "");

              const defaultImgRaw = pickDefaultImage(product);
              const hoverImgRaw = pickHoverImage(product);

              const defaultImg = absolutizeMaybe(defaultImgRaw);
              const hoverImg = absolutizeMaybe(hoverImgRaw);

              const canSwap = !!hoverImg && hoverImg !== defaultImg;

              return (
                <div
                  key={pid}
                  className="product-card bg-card border border-gold/20 hover:border-gold transition-all duration-300 group"
                >
                  <div className="relative overflow-hidden">
                    <Link to={`/products/${product.slug}`}>
                      <div className="relative w-full h-80">
                        {defaultImg ? (
                          <img
                            src={defaultImg}
                            alt={product.name}
                            className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                              canSwap ? "opacity-100 group-hover:opacity-0" : "opacity-100"
                            } group-hover:scale-105`}
                            loading="lazy"
                          />
                        ) : (
                          <div className="absolute inset-0 w-full h-full bg-black/5 border border-gold/10" />
                        )}

                        {canSwap ? (
                          <img
                            src={hoverImg}
                            alt={`${product.name} (on model)`}
                            className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
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