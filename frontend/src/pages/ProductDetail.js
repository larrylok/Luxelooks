import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Heart,
  ShoppingCart,
  ChevronLeft,
  Star,
  Check,
  X,
  Share2,
  Package,
  Shield,
  Truck,
} from "lucide-react";
import axios from "axios";
import storage from "@/utils/storage";
import analytics from "@/utils/analytics";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [giftOptions, setGiftOptions] = useState({
    giftWrap: false,
    giftMessage: "",
    giftReceipt: false,
  });
  const [reviews, setReviews] = useState([]);
  const [wishlist, setWishlist] = useState([]);

  useEffect(() => {
    loadProduct();
    loadWishlist();
  }, [slug]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      // Get all products and find by slug (since backend doesn't have slug search)
      const response = await axios.get(`${API}/products`, {
        params: { limit: 100 },
      });

      const prod = response.data.products.find(p => p.slug === slug);
      
      if (!prod) {
        toast.error("Product not found");
        navigate("/");
        return;
      }
      setProduct(prod);
      setSelectedVariant(prod.variants[0]);

      // Load reviews
      const reviewsResponse = await axios.get(`${API}/reviews`, {
        params: { productId: prod.id, status: "approved" },
      });
      setReviews(reviewsResponse.data);

      // Track view
      analytics.productView(prod.id, prod.name);

      // Add to recently viewed
      let rv = (await storage.get("recently_viewed")) || [];
      rv = rv.filter((id) => id !== prod.id);
      rv.unshift(prod.id);
      rv = rv.slice(0, 10);
      await storage.set("recently_viewed", rv);
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Failed to load product");
    }
    setLoading(false);
  };

  const loadWishlist = async () => {
    const wl = (await storage.get("wishlist")) || [];
    setWishlist(wl);
  };

  const toggleWishlist = async () => {
    let newWishlist = [...wishlist];
    const index = newWishlist.indexOf(product.id);

    if (index > -1) {
      newWishlist.splice(index, 1);
      toast.success("Removed from wishlist");
    } else {
      newWishlist.push(product.id);
      analytics.addToWishlist(product.id, product.name);
      toast.success("Added to wishlist");
    }

    setWishlist(newWishlist);
    await storage.set("wishlist", newWishlist);
    window.dispatchEvent(new Event("storage-update"));
  };

  const addToCart = async () => {
    if (!selectedVariant) {
      toast.error("Please select a variant");
      return;
    }

    if (selectedVariant.stock <= 0 && !product.allowPreorder) {
      toast.error("Product is out of stock");
      return;
    }

    const cart = (await storage.get("cart")) || {
      items: [],
      subtotal: 0,
      total: 0,
    };

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.productId === product.id && item.variantId === selectedVariant.id
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
      if (giftOptions.giftWrap) {
        cart.items[existingItemIndex].giftWrap = true;
        cart.items[existingItemIndex].giftMessage = giftOptions.giftMessage;
        cart.items[existingItemIndex].giftReceipt = giftOptions.giftReceipt;
      }
    } else {
      cart.items.push({
        productId: product.id,
        variantId: selectedVariant.id,
        quantity: quantity,
        giftWrap: giftOptions.giftWrap,
        giftMessage: giftOptions.giftMessage,
        giftReceipt: giftOptions.giftReceipt,
        isPreorder: selectedVariant.stock <= 0 && product.allowPreorder,
      });
    }

    await storage.set("cart", cart);
    window.dispatchEvent(new Event("storage-update"));
    analytics.addToCart(
      product.id,
      product.name,
      selectedVariant,
      quantity,
      product.basePrice
    );
    toast.success("Added to cart");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  const price = product.salePrice || product.basePrice;
  const finalPrice = price + (selectedVariant?.priceAdjustment || 0);
  const isInStock = selectedVariant && selectedVariant.stock > 0;
  const canPurchase = isInStock || product.allowPreorder;

  return (
    <div className="min-h-screen">
      {/* Breadcrumbs */}
      <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1600px] py-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-sm text-graphite hover:text-gold transition-colors"
          data-testid="back-button"
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>
      </div>

      {/* Product */}
      <section className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1600px] pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div className="relative mb-4 border-2 border-gold/20 overflow-hidden">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-[600px] object-cover"
                data-testid="product-main-image"
              />
              {!isInStock && product.allowPreorder && (
                <div className="absolute top-4 left-4 px-4 py-2 bg-midnight text-gold text-sm tracking-widest uppercase font-bold">
                  Pre-Order
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`border-2 transition-all ${
                      selectedImage === idx
                        ? "border-gold"
                        : "border-gold/20 hover:border-gold/50"
                    }`}
                    data-testid={`product-thumbnail-${idx}`}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${idx + 1}`}
                      className="w-full h-24 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="mb-6">
              <span className="text-xs tracking-widest uppercase text-graphite">
                {product.category}
              </span>
              <h1
                className="font-serif text-4xl md:text-5xl tracking-tight text-charcoal mt-2 mb-4"
                data-testid="product-title"
              >
                {product.name}
              </h1>
              
              {/* Rating */}
              {product.averageRating > 0 && (
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={18}
                        className={
                          star <= product.averageRating
                            ? "fill-gold text-gold"
                            : "text-gold/30"
                        }
                      />
                    ))}
                  </div>
                  <span className="text-sm text-graphite">
                    {product.averageRating} ({product.reviewCount} reviews)
                  </span>
                </div>
              )}

              {/* Price */}
              <div className="mb-6">
                {product.salePrice ? (
                  <div className="flex items-center space-x-3">
                    <span className="text-4xl font-light text-gold">
                      KES {finalPrice.toLocaleString()}
                    </span>
                    <span className="text-xl text-graphite line-through">
                      KES {product.basePrice.toLocaleString()}
                    </span>
                    <span className="px-3 py-1 bg-destructive text-white text-xs tracking-widest uppercase font-bold">
                      -{Math.round(product.discountPercentage)}%
                    </span>
                  </div>
                ) : (
                  <span className="text-4xl font-light text-charcoal">
                    KES {finalPrice.toLocaleString()}
                  </span>
                )}
              </div>

              <p className="text-lg text-graphite leading-relaxed mb-8">
                {product.longDescription}
              </p>
            </div>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div className="mb-8 pb-8 border-b border-gold/20">
                <h3 className="text-sm font-bold tracking-widest uppercase text-charcoal mb-4">
                  Select Variant
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {product.variants.map((variant) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant)}
                      className={`p-4 border-2 transition-all text-left ${
                        selectedVariant?.id === variant.id
                          ? "border-gold bg-secondary"
                          : "border-gold/20 hover:border-gold"
                      }`}
                      data-testid={`variant-${variant.id}`}
                    >
                      <div className="text-sm font-bold text-charcoal">
                        {variant.color} {variant.size && `- ${variant.size}`}
                      </div>
                      <div className="text-xs text-graphite mt-1">
                        {variant.material}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gold font-bold">
                          {variant.priceAdjustment > 0 &&
                            `+KES ${variant.priceAdjustment.toLocaleString()}`}
                          {variant.priceAdjustment === 0 && "Base price"}
                        </span>
                        {variant.stock > 0 ? (
                          <span className="text-xs text-green-700">
                            {variant.stock} in stock
                          </span>
                        ) : (
                          <span className="text-xs text-destructive">
                            Out of stock
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-8 pb-8 border-b border-gold/20">
              <h3 className="text-sm font-bold tracking-widest uppercase text-charcoal mb-4">
                Quantity
              </h3>
              <div className="flex items-center space-x-2 border border-gold/30 w-fit">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-secondary transition-colors"
                  data-testid="decrease-quantity"
                >
                  <span className="text-xl">−</span>
                </button>
                <span className="text-lg font-bold w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 hover:bg-secondary transition-colors"
                  data-testid="increase-quantity"
                >
                  <span className="text-xl">+</span>
                </button>
              </div>
            </div>

            {/* Gift Options */}
            {product.giftWrapAvailable && (
              <div className="mb-8 pb-8 border-b border-gold/20">
                <h3 className="text-sm font-bold tracking-widest uppercase text-charcoal mb-4">
                  Gift Options
                </h3>
                <label className="flex items-start space-x-3 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={giftOptions.giftWrap}
                    onChange={(e) =>
                      setGiftOptions({ ...giftOptions, giftWrap: e.target.checked })
                    }
                    className="mt-1 accent-gold"
                    data-testid="gift-wrap-checkbox"
                  />
                  <div>
                    <span className="text-sm text-charcoal">
                      Add gift wrapping (+KES {product.giftWrapCost})
                    </span>
                    <p className="text-xs text-graphite mt-1">
                      Elegant Art Deco gift packaging
                    </p>
                  </div>
                </label>

                {giftOptions.giftWrap && (
                  <>
                    <textarea
                      placeholder="Gift message (optional)"
                      value={giftOptions.giftMessage}
                      onChange={(e) =>
                        setGiftOptions({ ...giftOptions, giftMessage: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gold/30 bg-transparent focus:border-gold focus:ring-0 text-sm mb-3"
                      rows="3"
                      data-testid="gift-message-input"
                    />
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={giftOptions.giftReceipt}
                        onChange={(e) =>
                          setGiftOptions({
                            ...giftOptions,
                            giftReceipt: e.target.checked,
                          })
                        }
                        className="accent-gold"
                        data-testid="gift-receipt-checkbox"
                      />
                      <span className="text-sm text-charcoal">Include gift receipt</span>
                    </label>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-4 mb-8">
              <button
                onClick={addToCart}
                disabled={!canPurchase}
                className="flex-1 py-4 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-sm tracking-widest uppercase font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                data-testid="add-to-cart-button"
              >
                <ShoppingCart size={18} />
                <span>
                  {isInStock ? "Add to Cart" : product.allowPreorder ? "Pre-Order" : "Out of Stock"}
                </span>
              </button>
              <button
                onClick={toggleWishlist}
                className="p-4 border border-gold hover:bg-gold hover:text-white transition-all duration-300"
                data-testid="wishlist-button"
              >
                <Heart
                  size={20}
                  fill={wishlist.includes(product.id) ? "currentColor" : "none"}
                />
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied");
                }}
                className="p-4 border border-gold hover:bg-gold hover:text-white transition-all duration-300"
                data-testid="share-button"
              >
                <Share2 size={20} />
              </button>
            </div>

            {/* Info cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-gold/20 text-center">
                <Truck size={24} className="mx-auto text-gold mb-2" />
                <p className="text-xs font-bold tracking-widest uppercase">Free Shipping</p>
                <p className="text-xs text-graphite mt-1">Orders over KES 100,000</p>
              </div>
              <div className="p-4 border border-gold/20 text-center">
                <Shield size={24} className="mx-auto text-gold mb-2" />
                <p className="text-xs font-bold tracking-widest uppercase">Authentic</p>
                <p className="text-xs text-graphite mt-1">Certified genuine jewelry</p>
              </div>
              <div className="p-4 border border-gold/20 text-center">
                <Package size={24} className="mx-auto text-gold mb-2" />
                <p className="text-xs font-bold tracking-widest uppercase">30-Day Returns</p>
                <p className="text-xs text-graphite mt-1">Full refund guarantee</p>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-24">
          <div className="border-b border-gold/20 mb-8">
            <button className="pb-4 border-b-2 border-gold text-sm font-bold tracking-widest uppercase">
              Product Details
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-serif text-2xl text-charcoal mb-4">Description</h3>
              <p className="text-graphite leading-relaxed">{product.longDescription}</p>
            </div>
            
            <div>
              <h3 className="font-serif text-2xl text-charcoal mb-4">Specifications</h3>
              {product.materials && (
                <div className="mb-3">
                  <strong className="text-charcoal">Materials:</strong> {product.materials}
                </div>
              )}
              {product.weight && (
                <div className="mb-3">
                  <strong className="text-charcoal">Weight:</strong> {product.weight}
                </div>
              )}
              {product.dimensions && (
                <div className="mb-3">
                  <strong className="text-charcoal">Dimensions:</strong> {product.dimensions}
                </div>
              )}
              {product.careInstructions && (
                <div className="mb-3">
                  <strong className="text-charcoal">Care:</strong> {product.careInstructions}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
