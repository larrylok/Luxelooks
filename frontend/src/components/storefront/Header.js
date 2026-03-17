import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Heart, Search, Menu, X } from "lucide-react";
import api from "@/api";
import storage from "@/utils/storage";
import logoMark from "@/assets/luxe_looks_logo.png";

export default function Header({ onCartClick }) {
  const navigate = useNavigate();

  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [navData, setNavData] = useState({ categories: [], collections: [], pages: [] });

  useEffect(() => {
    loadCounts();
    loadNavigation();

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    const handleNavUpdate = () => {
      loadNavigation();
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("storage-update", loadCounts);
    window.addEventListener("storefront-navigation-updated", handleNavUpdate);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("storage-update", loadCounts);
      window.removeEventListener("storefront-navigation-updated", handleNavUpdate);
    };
  }, []);

  const loadCounts = async () => {
    const cart = await storage.get("cart");
    const wishlist = await storage.get("wishlist");

    setCartCount(cart?.items?.length || 0);
    setWishlistCount(wishlist?.length || 0);
  };

  const loadNavigation = async () => {
    try {
      const res = await api.get("/storefront/navigation");
      setNavData({
        categories: Array.isArray(res.data?.categories) ? res.data.categories : [],
        collections: Array.isArray(res.data?.collections) ? res.data.collections : [],
        pages: Array.isArray(res.data?.pages) ? res.data.pages : [],
      });
    } catch (err) {
      console.error("Failed to load storefront navigation:", err);
      setNavData({ categories: [], collections: [], pages: [] });
    }
  };

  const topCategories = navData.categories.filter((c) => c.showInMenu !== false);
  const headerPages = navData.pages.filter((p) => p.showInHeader);
  const featuredCollections = navData.collections.filter((c) => c.featured).slice(0, 2);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-morphism shadow-md" : "bg-background"
      }`}
    >
      <div className="border-b border-gold/20">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1600px]">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center shrink-0" data-testid="logo-link">
              <img src={logoMark} alt="Luxe Looks" className="h-12 w-auto object-contain" />
            </Link>

            <nav className="hidden lg:flex items-center justify-center gap-x-8 gap-y-2 flex-wrap flex-1 px-8">
              <Link
                to="/"
                className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors duration-300 whitespace-nowrap"
                data-testid="nav-home"
              >
                Home
              </Link>

              {topCategories.map((category) => (
                <Link
                  key={`cat-${category.slug}`}
                  to={`/categories/${category.slug}`}
                  className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors duration-300 whitespace-nowrap"
                >
                  {category.name}
                </Link>
              ))}

              {headerPages.map((page) => (
                <Link
                  key={`page-${page.slug}`}
                  to={`/pages/${page.slug}`}
                  className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors duration-300 whitespace-nowrap"
                >
                  {page.name}
                </Link>
              ))}

              {featuredCollections.map((collection) => (
                <Link
                  key={`col-${collection.slug}`}
                  to={`/?collection=${encodeURIComponent(collection.slug)}`}
                  className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors duration-300 whitespace-nowrap"
                >
                  {collection.name}
                </Link>
              ))}

              <Link
                to="/track-order"
                className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors duration-300 whitespace-nowrap"
                data-testid="nav-track-order"
              >
                Track Order
              </Link>
            </nav>

            <div className="flex items-center space-x-4 shrink-0">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/?openFilters=1");
                }}
                className="relative p-2 hover:bg-secondary transition-colors duration-300"
                aria-label="Search"
                data-testid="search-button"
                type="button"
              >
                <Search size={20} className="text-charcoal" />
              </button>

              <Link
                to="/wishlist"
                className="relative p-2 hover:bg-secondary transition-colors duration-300"
                aria-label="Wishlist"
                data-testid="wishlist-button"
              >
                <Heart size={20} className="text-charcoal" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-white text-xs flex items-center justify-center font-bold">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <button
                onClick={onCartClick}
                className="relative p-2 hover:bg-secondary transition-colors duration-300"
                aria-label="Shopping Cart"
                data-testid="cart-button"
                type="button"
              >
                <ShoppingCart size={20} className="text-charcoal" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gold text-white text-xs flex items-center justify-center font-bold">
                    {cartCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 hover:bg-secondary transition-colors duration-300"
                aria-label="Menu"
                data-testid="mobile-menu-button"
                type="button"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="lg:hidden bg-card border-t border-gold/20" data-testid="mobile-menu">
          <nav className="container mx-auto px-6 py-4 flex flex-col space-y-4">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors"
            >
              Home
            </Link>

            {topCategories.map((category) => (
              <Link
                key={`m-cat-${category.slug}`}
                to={`/categories/${category.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors"
              >
                {category.name}
              </Link>
            ))}

            {headerPages.map((page) => (
              <Link
                key={`m-page-${page.slug}`}
                to={`/pages/${page.slug}`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors"
              >
                {page.name}
              </Link>
            ))}

            {featuredCollections.map((collection) => (
              <Link
                key={`m-col-${collection.slug}`}
                to={`/?collection=${encodeURIComponent(collection.slug)}`}
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors"
              >
                {collection.name}
              </Link>
            ))}

            <Link
              to="/track-order"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors"
            >
              Track Order
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}