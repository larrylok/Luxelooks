import React, { useState, useEffect } from "react";
import { X, Plus, Minus, Trash2, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import storage from "@/utils/storage";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CartDrawer({ open, onClose }) {
  const [cart, setCart] = useState(null);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      loadCart();
    }
  }, [open]);

  const loadCart = async () => {
    setLoading(true);
    const cartData = await storage.get("cart") || { items: [], subtotal: 0, giftWrapTotal: 0, total: 0 };
    setCart(cartData);

    // Load product details
    const productPromises = cartData.items.map(item =>
      axios.get(`${API}/products/${item.productId}`)
    );

    try {
      const responses = await Promise.all(productPromises);
      const productsMap = {};
      responses.forEach(res => {
        productsMap[res.data.id] = res.data;
      });
      setProducts(productsMap);
    } catch (error) {
      console.error("Error loading products:", error);
    }

    setLoading(false);
  };

  const updateQuantity = async (itemIndex, delta) => {
    const newCart = { ...cart };
    newCart.items[itemIndex].quantity = Math.max(1, newCart.items[itemIndex].quantity + delta);
    
    // Recalculate totals
    calculateTotals(newCart);
    setCart(newCart);
    await storage.set("cart", newCart);
    window.dispatchEvent(new Event("storage-update"));
  };

  const removeItem = async (itemIndex) => {
    const newCart = { ...cart };
    newCart.items.splice(itemIndex, 1);
    calculateTotals(newCart);
    setCart(newCart);
    await storage.set("cart", newCart);
    window.dispatchEvent(new Event("storage-update"));
    toast.success("Item removed from cart");
  };

  const calculateTotals = (cartData) => {
    let subtotal = 0;
    let giftWrapTotal = 0;

    cartData.items.forEach(item => {
      const product = products[item.productId];
      if (product) {
        const variant = product.variants.find(v => v.id === item.variantId);
        if (variant) {
          const price = product.salePrice || product.basePrice;
          const itemPrice = price + variant.priceAdjustment;
          subtotal += itemPrice * item.quantity;
          
          if (item.giftWrap && product.giftWrapAvailable) {
            giftWrapTotal += product.giftWrapCost * item.quantity;
          }
        }
      }
    });

    cartData.subtotal = subtotal;
    cartData.giftWrapTotal = giftWrapTotal;
    cartData.total = subtotal + giftWrapTotal;
  };

  const handleCheckout = () => {
    onClose();
    navigate("/checkout");
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-charcoal/60 z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-card z-50 shadow-2xl transform transition-transform duration-300">
        {/* Header */}
        <div className="border-b-2 border-gold/20 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl tracking-tight text-charcoal">
              Shopping Cart
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-secondary transition-colors"
              aria-label="Close cart"
              data-testid="close-cart-button"
            >
              <X size={24} className="text-charcoal" />
            </button>
          </div>
        </div>

        {/* Cart items */}
        <div className="flex flex-col h-[calc(100%-80px)]">
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-graphite">Loading cart...</p>
              </div>
            ) : cart?.items?.length === 0 ? (
              <div className="text-center py-12" data-testid="empty-cart">
                <ShoppingBag size={64} className="mx-auto text-gold/30 mb-4" />
                <p className="font-serif text-xl text-charcoal mb-2">Your cart is empty</p>
                <p className="text-sm text-graphite mb-6">
                  Add some beautiful jewelry to get started
                </p>
                <button
                  onClick={onClose}
                  className="px-8 py-3 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {cart.items.map((item, index) => {
                  const product = products[item.productId];
                  if (!product) return null;

                  const variant = product.variants.find(v => v.id === item.variantId);
                  const price = product.salePrice || product.basePrice;
                  const itemPrice = price + (variant?.priceAdjustment || 0);

                  return (
                    <div
                      key={index}
                      className="flex space-x-4 border border-gold/20 p-4"
                      data-testid={`cart-item-${index}`}
                    >
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-24 h-24 object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-serif text-base text-charcoal mb-1">
                          {product.name}
                        </h3>
                        {variant && (
                          <p className="text-xs text-graphite mb-2">
                            {variant.color} {variant.size && `- ${variant.size}`}
                          </p>
                        )}
                        {item.giftWrap && (
                          <p className="text-xs text-gold mb-2">+ Gift wrap</p>
                        )}
                        <p className="text-sm font-bold text-charcoal">
                          KES {itemPrice.toLocaleString()}
                        </p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-2 border border-gold/30">
                            <button
                              onClick={() => updateQuantity(index, -1)}
                              className="p-2 hover:bg-secondary transition-colors"
                              data-testid={`decrease-quantity-${index}`}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-bold w-8 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(index, 1)}
                              className="p-2 hover:bg-secondary transition-colors"
                              data-testid={`increase-quantity-${index}`}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          
                          <button
                            onClick={() => removeItem(index)}
                            className="p-2 text-destructive hover:bg-destructive/10 transition-colors"
                            data-testid={`remove-item-${index}`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {cart?.items?.length > 0 && (
            <div className="border-t-2 border-gold/20 p-6 bg-secondary">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-graphite">Subtotal</span>
                  <span className="text-charcoal font-bold">
                    KES {cart.subtotal.toLocaleString()}
                  </span>
                </div>
                {cart.giftWrapTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-graphite">Gift Wrap</span>
                    <span className="text-charcoal font-bold">
                      KES {cart.giftWrapTotal.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg border-t border-gold/20 pt-3">
                  <span className="font-serif text-charcoal">Total</span>
                  <span className="font-serif text-gold font-bold">
                    KES {cart.total.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleCheckout}
                className="w-full py-4 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-xs tracking-widest uppercase font-bold"
                data-testid="checkout-button"
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
