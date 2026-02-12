import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Heart, ShoppingCart, Eye, TrendingUp, ChevronDown, SlidersHorizontal } from "lucide-react";
import axios from "axios";
import storage from "@/utils/storage";
import analytics from "@/utils/analytics";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    category: searchParams.get("category") || "",
    search: searchParams.get("search") || "",
    sort: searchParams.get("sort") || "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    analytics.pageView("Home");
    loadWishlist();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [page, filters]);

  const loadWishlist = async () => {
    const wl = await storage.get("wishlist") || [];
    setWishlist(wl);
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

      const response = await axios.get(`${API}/products`, { params });
      setProducts(response.data.products);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
    }
    setLoading(false);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setPage(1);
    
    // Update URL
    const params = {};
    if (newFilters.category) params.category = newFilters.category;
    if (newFilters.search) params.search = newFilters.search;
    if (newFilters.sort) params.sort = newFilters.sort;
    setSearchParams(params);
  };

  const toggleWishlist = async (productId) => {
    let newWishlist = [...wishlist];
    const index = newWishlist.indexOf(productId);
    
    if (index > -1) {
      newWishlist.splice(index, 1);
      toast.success("Removed from wishlist");
    } else {
      newWishlist.push(productId);
      const product = products.find(p => p.id === productId);
      analytics.addToWishlist(productId, product?.name);
      toast.success("Added to wishlist");
    }
    
    setWishlist(newWishlist);
    await storage.set("wishlist", newWishlist);
    window.dispatchEvent(new Event("storage-update"));
  };

  const addToCart = async (product) => {
    if (!product.variants || product.variants.length === 0) {
      toast.error("Product has no variants available");
      return;
    }

    const defaultVariant = product.variants[0];
    
    if (defaultVariant.stock <= 0 && !product.allowPreorder) {
      toast.error("Product is out of stock");
      return;
    }

    const cart = await storage.get("cart") || { items: [], subtotal: 0, total: 0 };
    
    const existingItemIndex = cart.items.findIndex(
      item => item.productId === product.id && item.variantId === defaultVariant.id
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += 1;
    } else {
      cart.items.push({
        productId: product.id,
        variantId: defaultVariant.id,
        quantity: 1,
        giftWrap: false,
        giftMessage: null,
        giftReceipt: false,
        isPreorder: defaultVariant.stock <= 0 && product.allowPreorder,
      });
    }

    await storage.set("cart", cart);
    window.dispatchEvent(new Event("storage-update"));
    analytics.addToCart(product.id, product.name, defaultVariant, 1, product.basePrice);
    toast.success("Added to cart");
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <div className="absolute inset-0 sunburst-gradient"></div>
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1768528426138-eeeaa7f74414?w=1600')` }}
        ></div>
        <div className="relative h-full flex items-center justify-center text-center px-6">
          <div className="max-w-4xl animate-fade-in">
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-tight leading-[0.9] text-charcoal mb-6">
              ART DECO
              <br />
              <span className="text-gold">ELEGANCE</span>
            </h1>
            <p className="text-lg md:text-xl text-graphite mb-8 leading-relaxed max-w-2xl mx-auto">
              Discover our curated collection of 1920s-inspired luxury jewelry.
              Each piece is a masterpiece of geometric precision and timeless beauty.
            </p>
            <button
              onClick={() => handleFilterChange("category", "Necklaces")}
              className="px-12 py-4 bg-charcoal text-gold border-2 border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-sm tracking-widest uppercase font-bold art-deco-button"
              data-testid="shop-now-button"
            >
              Shop Now
            </button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-12 left-12 w-24 h-24 border-2 border-gold/30 transform rotate-45"></div>
        <div className="absolute bottom-12 right-12 w-32 h-32 border-2 border-gold/30 transform rotate-45"></div>
      </section>

      {/* Filters and Products */}
      <section className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1600px] py-16">
        {/* Filter bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12 pb-6 border-b border-gold/20">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl tracking-tight text-charcoal">
              {filters.category || "All Jewelry"}
            </h2>
            <p className="text-sm text-graphite mt-1">
              Discover our collection of luxury Art Deco pieces
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gold/30 hover:border-gold transition-colors text-sm"
              data-testid="filter-toggle"
            >
              <SlidersHorizontal size={16} />
              <span>Filters</span>
            </button>
            
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange("sort", e.target.value)}
              className="px-4 py-2 border border-gold/30 bg-transparent text-sm focus:border-gold focus:ring-0"
              data-testid="sort-select"
            >
              <option value="">Sort By</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Expandable filters */}
        {showFilters && (
          <div className="mb-8 p-6 border border-gold/20 bg-secondary animate-slide-down" data-testid="filters-panel">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-bold mb-3 tracking-widest uppercase text-charcoal">
                  Category
                </label>
                <div className="space-y-2">
                  {["", "Necklaces", "Earrings", "Bracelets"].map(cat => (
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
                  data-testid="search-input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Products grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-graphite">Loading our collection...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20" data-testid="no-products">
            <p className="font-serif text-2xl text-charcoal mb-2">No products found</p>
            <p className="text-graphite">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="product-card bg-card border border-gold/20 hover:border-gold transition-all duration-300 group"
                  data-testid={`product-${product.id}`}
                >
                  <div className="relative overflow-hidden">
                    <Link to={`/products/${product.slug}`}>
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-80 object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </Link>
                    
                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      {product.isBestseller && (
                        <span className="px-3 py-1 bg-gold text-white text-xs tracking-widest uppercase font-bold">
                          Bestseller
                        </span>
                      )}
                      {product.isNewArrival && (
                        <span className="px-3 py-1 bg-charcoal text-gold text-xs tracking-widest uppercase font-bold">
                          New
                        </span>
                      )}
                      {product.discountPercentage && (
                        <span className="px-3 py-1 bg-destructive text-white text-xs tracking-widest uppercase font-bold">
                          -{Math.round(product.discountPercentage)}%
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={() => toggleWishlist(product.id)}
                        className="w-10 h-10 bg-pearl border border-gold flex items-center justify-center hover:bg-gold hover:text-white transition-colors"
                        data-testid={`wishlist-${product.id}`}
                      >
                        <Heart
                          size={18}
                          fill={wishlist.includes(product.id) ? "currentColor" : "none"}
                        />
                      </button>
                      <Link
                        to={`/products/${product.slug}`}
                        className="w-10 h-10 bg-pearl border border-gold flex items-center justify-center hover:bg-gold hover:text-white transition-colors"
                        data-testid={`view-${product.id}`}
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

                    <div className="flex items-center justify-between mb-4">
                      <div>
                        {product.salePrice ? (
                          <div className="flex items-center space-x-2">
                            <span className="text-xl font-light text-gold">
                              KES {product.salePrice.toLocaleString()}
                            </span>
                            <span className="text-sm text-graphite line-through">
                              KES {product.basePrice.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xl font-light text-charcoal">
                            KES {product.basePrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      
                      {product.averageRating > 0 && (
                        <div className="flex items-center space-x-1">
                          <span className="text-gold">★</span>
                          <span className="text-sm font-bold">{product.averageRating}</span>
                          <span className="text-xs text-graphite">({product.reviewCount})</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      className="w-full py-3 bg-transparent border border-gold text-charcoal hover:bg-charcoal hover:text-gold transition-all duration-300 text-xs tracking-widest uppercase font-bold flex items-center justify-center space-x-2"
                      data-testid={`add-to-cart-${product.id}`}
                    >
                      <ShoppingCart size={16} />
                      <span>Add to Cart</span>
                    </button>

                    {/* Social proof */}
                    {product.viewCount > 100 && (
                      <div className="flex items-center justify-center space-x-1 mt-3 text-xs text-graphite">
                        <Eye size={12} />
                        <span>{product.viewCount} views this month</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-16">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-6 py-2 border border-gold/30 hover:border-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                  data-testid="prev-page"
                >
                  Previous
                </button>
                
                <span className="text-sm text-graphite">
                  Page {page} of {totalPages}
                </span>
                
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-6 py-2 border border-gold/30 hover:border-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm"
                  data-testid="next-page"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Featured collections */}
      <section className="bg-secondary py-24">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1600px]">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl md:text-5xl tracking-tight text-charcoal mb-4">
              Curated Collections
            </h2>
            <p className="text-lg text-graphite">
              Explore our handpicked selections
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {["Featured Collection", "New Arrivals", "Luxury Collection"].map((collection, idx) => (
              <Link
                key={idx}
                to={`/?collection=${collection.toLowerCase().replace(" ", "-")}`}
                className="relative h-96 overflow-hidden border-2 border-gold/20 hover:border-gold transition-all duration-500 group"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal/80 to-transparent z-10"></div>
                <img
                  src={`https://images.unsplash.com/photo-${
                    idx === 0 ? "1768528426138-eeeaa7f74414" :
                    idx === 1 ? "1736436789706-005f2218a96d" :
                    "1749318104909-ee768bac4d7e"
                  }?w=600`}
                  alt={collection}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute bottom-0 left-0 right-0 p-8 z-20">
                  <h3 className="font-serif text-2xl text-pearl mb-2">{collection}</h3>
                  <p className="text-sm text-pearl/80 tracking-widest uppercase">Explore →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
