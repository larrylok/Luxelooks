
import React from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter } from "lucide-react";
import logoMark from "@/assets/luxe_looks_logo.png";

export default function Footer() {
  return (
    <footer className="bg-midnight text-pearl mt-24">
      <div className="border-t-2 border-gold">
        <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1600px] py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {/* Brand */}
            <div>
              <div className="mb-6">
                <img
                  src={logoMark}
                  alt="Luxe Looks Logo"
                  className="h-16 w-auto mb-4 brightness-0 invert"
                />
              </div>
              <p className="text-sm leading-relaxed text-pearl/80">
                Curating the finest Art Deco-inspired jewelry pieces in Kenya since
                2026. Each piece tells a story of elegance and timeless beauty.
              </p>
            </div>

            {/* Shop */}
            <div>
              <h4 className="font-serif text-lg mb-6 tracking-tight text-gold">
                Shop
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/?category=Necklaces"
                    className="text-sm hover:text-gold transition-colors"
                  >
                    Necklaces
                  </Link>
                </li>
                <li>
                  <Link
                    to="/?category=Earrings"
                    className="text-sm hover:text-gold transition-colors"
                  >
                    Earrings
                  </Link>
                </li>
                <li>
                  <Link
                    to="/?category=Bracelets"
                    className="text-sm hover:text-gold transition-colors"
                  >
                    Bracelets
                  </Link>
                </li>
                <li>
                  <Link
                    to="/?collection=featured"
                    className="text-sm hover:text-gold transition-colors"
                  >
                    Featured Collection
                  </Link>
                </li>
                <li>
                  <Link
                    to="/?collection=new-arrivals"
                    className="text-sm hover:text-gold transition-colors"
                  >
                    New Arrivals
                  </Link>
                </li>
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h4 className="font-serif text-lg mb-6 tracking-tight text-gold">
                Customer Service
              </h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/track-order"
                    className="text-sm hover:text-gold transition-colors"
                  >
                    Track Your Order
                  </Link>
                </li>
                <li>
                  <Link
                    to="/shipping"
                    className="text-sm hover:text-gold transition-colors"
                  >
                    Shipping &amp; Delivery
                  </Link>
                </li>
                <li>
                  <Link
                    to="/returns"
                    className="text-sm hover:text-gold transition-colors"
                  >
                    Returns &amp; Exchanges
                  </Link>
                </li>
                <li>
                  <Link
                    to="/size-guide"
                    className="text-sm hover:text-gold transition-colors"
                  >
                    Size Guide
                  </Link>
                </li>
                <li>
                  <Link
                    to="/care"
                    className="text-sm hover:text-gold transition-colors"
                  >
                    Care Instructions
                  </Link>
                </li>
                <li>
                  <Link
                    to="/faqs"
                    className="text-sm hover:text-gold transition-colors"
                  >
                    FAQs
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-serif text-lg mb-6 tracking-tight text-gold">
                Contact Us
              </h4>
              <ul className="space-y-4">
                <li className="flex items-start space-x-3">
                  <MapPin size={18} className="text-gold mt-1 flex-shrink-0" />
                  <span className="text-sm">Westlands, Nairobi, Kenya</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Phone size={18} className="text-gold mt-1 flex-shrink-0" />
                  <span className="text-sm">+254 700 123 456</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Mail size={18} className="text-gold mt-1 flex-shrink-0" />
                  <span className="text-sm">info@luxelooks.ke</span>
                </li>
              </ul>

              <div className="flex space-x-4 mt-6">
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 border border-gold flex items-center justify-center hover:bg-gold hover:text-midnight transition-all duration-300"
                  aria-label="Instagram"
                >
                  <Instagram size={18} />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 border border-gold flex items-center justify-center hover:bg-gold hover:text-midnight transition-all duration-300"
                  aria-label="Facebook"
                >
                  <Facebook size={18} />
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-10 h-10 border border-gold flex items-center justify-center hover:bg-gold hover:text-midnight transition-all duration-300"
                  aria-label="Twitter"
                >
                  <Twitter size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gold/20">
          <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1600px] py-6">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <p className="text-sm text-pearl/60">
                © 2026 Luxe Looks. All rights reserved.
              </p>
              <div className="flex space-x-6">
                <Link
                  to="/privacy"
                  className="text-sm text-pearl/60 hover:text-gold transition-colors"
                >
                  Privacy Policy
                </Link>
                <Link
                  to="/terms"
                  className="text-sm text-pearl/60 hover:text-gold transition-colors"
                >
                  Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}