import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Heart, Search, Menu, X } from "lucide-react";
import storage from "@/utils/storage";
import logoMark from "@/assets/luxe_looks_logo.png";

export default function Header({ onCartClick }) {
  const navigate = useNavigate();

  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    loadCounts();

    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("storage-update", loadCounts);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("storage-update", loadCounts);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCounts = async () => {
    const cart = await storage.get("cart");
    const wishlist = await storage.get("wishlist");

    setCartCount(cart?.items?.length || 0);
    setWishlistCount(wishlist?.length || 0);
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass-morphism shadow-md" : "bg-background"
      }`}
    >
      <div className="border-b border-gold/20">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1600px]">
          <div className="flex items-center justify-between h-20">
            {/* ✅ LOGO */}
            <Link to="/" className="flex items-center" data-testid="logo-link">
              <img
                src={logoMark}
                alt="Luxe Looks"
                className="h-12 w-auto object-contain"
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <Link
                to="/"
                className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors duration-300"
                data-testid="nav-home"
              >
                Home
              </Link>
              <Link
                to="/?category=Necklaces"
                className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors duration-300"
                data-testid="nav-necklaces"
              >
                Necklaces
              </Link>
              <Link
                to="/?category=Earrings"
                className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors duration-300"
                data-testid="nav-earrings"
              >
                Earrings
              </Link>
              <Link
                to="/?category=Bracelets"
                className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors duration-300"
                data-testid="nav-bracelets"
              >
                Bracelets
              </Link>
              <Link
                to="/?collection=featured"
                className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors duration-300"
                data-testid="nav-featured"
              >
                Featured
              </Link>

              {/* ✅ Track Order */}
              <Link
                to="/track-order"
                className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors duration-300"
                data-testid="nav-track-order"
              >
                Track Order
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              {/* ✅ SEARCH (now works) */}
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden bg-card border-t border-gold/20"
          data-testid="mobile-menu"
        >
          <nav className="container mx-auto px-6 py-4 flex flex-col space-y-4">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors"
            >
              Home
            </Link>
            <Link
              to="/?category=Necklaces"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors"
            >
              Necklaces
            </Link>
            <Link
              to="/?category=Earrings"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors"
            >
              Earrings
            </Link>
            <Link
              to="/?category=Bracelets"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors"
            >
              Bracelets
            </Link>
            <Link
              to="/?collection=featured"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm tracking-widest uppercase text-charcoal hover:text-gold transition-colors"
            >
              Featured
            </Link>

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