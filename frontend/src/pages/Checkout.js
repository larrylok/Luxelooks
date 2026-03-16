import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Loader2,
  AlertCircle,
  Smartphone,
  Copy as CopyIcon,
  MapPin,
  Phone as PhoneIcon,
} from "lucide-react";
import storage from "@/utils/storage";
import analytics from "@/utils/analytics";
import { toast } from "sonner";

import api from "@/api"; // shared axios client (baseURL already includes /api)

// ---- helpers ----
function buildOrderNumber() {
  const d = new Date();
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `LX-${ymd}-${rand}`;
}

function safeStr(x) {
  return String(x ?? "").trim();
}

function safeNum(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function safeArr(x) {
  return Array.isArray(x) ? x : [];
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

function pickDefaultImage(product) {
  const primary = safeStr(product?.primaryImage);
  if (primary) return primary;
  const imgs = safeArr(product?.images);
  return imgs[0] || "";
}

export default function Checkout() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Info, 2: Payment, 3: Confirmation
  const [cart, setCart] = useState(null);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [order, setOrder] = useState(null);

  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
    isGuest: true,
  });

  const [deliveryInfo, setDeliveryInfo] = useState({
    address: "",
    city: "",
    county: "",
    method: "standard",
    cost: 500,
  });

  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [mpesaPhone, setMpesaPhone] = useState("");

  useEffect(() => {
    loadCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCart = async () => {
    setLoading(true);

    const cartData = await storage.get("cart");

    if (!cartData || !Array.isArray(cartData.items) || cartData.items.length === 0) {
      toast.error("Your cart is empty");
      setLoading(false);
      navigate("/");
      return;
    }

    cartData.items = safeArr(cartData.items);
    setCart(cartData);

    try {
      const productPromises = cartData.items.map((item) =>
        api.get(`/products/${item.productId}`)
      );

      const responses = await Promise.all(productPromises);
      const productsMap = {};
      responses.forEach((res) => {
        const p = res?.data;
        if (!p) return;
        if (p?.id) productsMap[p.id] = p;
        if (p?._id) productsMap[p._id] = p;
      });
      setProducts(productsMap);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Could not load products. Please refresh.");
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let giftWrapTotal = 0;

    safeArr(cart?.items).forEach((item) => {
      const product = products?.[item.productId];
      if (!product) return;

      const variant = safeArr(product.variants).find((v) => v?.id === item.variantId);

      const basePrice = safeNum(product.salePrice || product.basePrice || 0, 0);
      const adj = safeNum(variant?.priceAdjustment || 0, 0);
      const qty = safeNum(item.quantity || 0, 0);
      const itemPrice = basePrice + adj;

      subtotal += itemPrice * qty;

      if (item.giftWrap && product.giftWrapAvailable) {
        giftWrapTotal += safeNum(product.giftWrapCost || 0, 0) * qty;
      }
    });

    const shippingCost = safeNum(deliveryInfo.cost || 0, 0);
    const total = subtotal + giftWrapTotal + shippingCost;

    return { subtotal, giftWrapTotal, shippingCost, total };
  }, [cart, products, deliveryInfo]);

  const handleCustomerInfoSubmit = (e) => {
    e.preventDefault();

    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error("Please fill in all fields");
      return;
    }

    analytics.initiateCheckout(totals.total, safeArr(cart?.items).length || 0);
    setStep(2);
  };

  const handlePayment = async () => {
    if (paymentMethod === "mpesa" && !mpesaPhone) {
      toast.error("Please enter your M-Pesa phone number");
      return;
    }

    setProcessingPayment(true);

    // Mock M-Pesa STK Push
    toast.info("Sending M-Pesa STK Push to your phone...");

    setTimeout(async () => {
      try {
        const orderNumber = buildOrderNumber();
        const nowIso = new Date().toISOString();

        const orderData = {
          orderNumber,
          customer: {
            ...customerInfo,
            phone: safeStr(customerInfo.phone),
          },
          delivery: deliveryInfo,
          items: safeArr(cart?.items),
          subtotal: totals.subtotal,
          giftWrapTotal: totals.giftWrapTotal,
          discount: 0,
          shippingCost: totals.shippingCost,
          total: totals.total,
          payment: {
            method: "M-Pesa",
            status: "confirmed",
            mpesaTransactionId: `MOCK${Date.now()}`,
            confirmedAt: nowIso,
          },
          status: "pending",
          statusHistory: [
            {
              status: "pending",
              at: nowIso,
              timestamp: nowIso,
              note: "Order placed",
            },
          ],
        };

        const response = await api.post(`/orders`, orderData);
        setOrder(response.data);

        try {
          await storage.set("lastOrder", {
            orderNumber: response.data?.orderNumber || orderNumber,
            phone: safeStr(customerInfo.phone),
            createdAt: nowIso,
          });
        } catch (e) {
          console.warn("Failed to store lastOrder", e);
        }

        try {
          analytics.purchase(response.data?.id, totals.total, safeArr(cart?.items));
        } catch (e) {
          console.warn("analytics.purchase failed:", e);
        }

        await storage.set("cart", { items: [], subtotal: 0, total: 0 });
        window.dispatchEvent(new Event("storage-update"));

        toast.success("Payment confirmed!");
        setStep(3);
      } catch (error) {
        console.error("Error creating order:", error);
        toast.error("Failed to process order");
      } finally {
        setProcessingPayment(false);
      }
    }, 3000);
  };

  const handleCopyOrderNumber = async () => {
    const orderNo = order?.orderNumber;
    if (!orderNo) return;

    try {
      await navigator.clipboard.writeText(orderNo);
      toast.success("Order number copied");
    } catch (e) {
      try {
        const el = document.createElement("textarea");
        el.value = orderNo;
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
        toast.success("Order number copied");
      } catch {
        toast.error("Could not copy. Please select and copy manually.");
      }
    }
  };

  const handleGoToTracking = () => {
    const orderNo = safeStr(order?.orderNumber);
    const phone = safeStr(customerInfo.phone);
    if (!orderNo) return;

    const qs = new URLSearchParams();
    qs.set("orderNumber", orderNo);
    if (phone) qs.set("phone", phone);

    navigate(`/track-order?${qs.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1400px]">
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-charcoal mb-8">
          Checkout
        </h1>

        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center justify-center w-10 h-10 border-2 ${
                step >= 1 ? "border-gold bg-gold text-white" : "border-gold/30"
              }`}
            >
              {step > 1 ? <Check size={20} /> : <span>1</span>}
            </div>
            <div className={`h-0.5 w-24 ${step >= 2 ? "bg-gold" : "bg-gold/30"}`} />
            <div
              className={`flex items-center justify-center w-10 h-10 border-2 ${
                step >= 2 ? "border-gold bg-gold text-white" : "border-gold/30"
              }`}
            >
              {step > 2 ? <Check size={20} /> : <span>2</span>}
            </div>
            <div className={`h-0.5 w-24 ${step >= 3 ? "bg-gold" : "bg-gold/30"}`} />
            <div
              className={`flex items-center justify-center w-10 h-10 border-2 ${
                step >= 3 ? "border-gold bg-gold text-white" : "border-gold/30"
              }`}
            >
              <span>3</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            {step === 1 && (
              <form onSubmit={handleCustomerInfoSubmit}>
                <div className="bg-card border-2 border-gold/20 p-8 mb-8">
                  <h2 className="font-serif text-2xl text-charcoal mb-6">
                    Contact Information
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2 tracking-widest uppercase">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={customerInfo.name}
                        onChange={(e) =>
                          setCustomerInfo({ ...customerInfo, name: e.target.value })
                        }
                        className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0"
                        required
                        data-testid="customer-name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2 tracking-widest uppercase">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) =>
                          setCustomerInfo({ ...customerInfo, email: e.target.value })
                        }
                        className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0"
                        required
                        data-testid="customer-email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold mb-2 tracking-widest uppercase">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={customerInfo.phone}
                        onChange={(e) =>
                          setCustomerInfo({ ...customerInfo, phone: e.target.value })
                        }
                        placeholder="+254 7XX XXX XXX"
                        className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0"
                        required
                        data-testid="customer-phone"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-card border-2 border-gold/20 p-8 mb-8">
                  <h2 className="font-serif text-2xl text-charcoal mb-6">
                    Delivery Address
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold mb-2 tracking-widest uppercase">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={deliveryInfo.address}
                        onChange={(e) =>
                          setDeliveryInfo({ ...deliveryInfo, address: e.target.value })
                        }
                        className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0"
                        required
                        data-testid="delivery-address"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold mb-2 tracking-widest uppercase">
                          City *
                        </label>
                        <input
                          type="text"
                          value={deliveryInfo.city}
                          onChange={(e) =>
                            setDeliveryInfo({ ...deliveryInfo, city: e.target.value })
                          }
                          className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0"
                          required
                          data-testid="delivery-city"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2 tracking-widest uppercase">
                          County *
                        </label>
                        <input
                          type="text"
                          value={deliveryInfo.county}
                          onChange={(e) =>
                            setDeliveryInfo({ ...deliveryInfo, county: e.target.value })
                          }
                          className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0"
                          required
                          data-testid="delivery-county"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold mb-2 tracking-widest uppercase">
                        Shipping Method
                      </label>
                      <div className="space-y-3">
                        {[
                          {
                            id: "standard",
                            name: "Standard Delivery",
                            days: "3-5 business days",
                            cost: 500,
                          },
                          {
                            id: "express",
                            name: "Express Delivery",
                            days: "1-2 business days",
                            cost: 1500,
                          },
                          {
                            id: "overnight",
                            name: "Overnight Delivery",
                            days: "Next business day",
                            cost: 3000,
                          },
                        ].map((method) => (
                          <label
                            key={method.id}
                            className="flex items-center justify-between p-4 border-2 border-gold/20 cursor-pointer hover:border-gold transition-all"
                          >
                            <div className="flex items-center space-x-3">
                              <input
                                type="radio"
                                name="shipping"
                                checked={deliveryInfo.method === method.id}
                                onChange={() =>
                                  setDeliveryInfo({
                                    ...deliveryInfo,
                                    method: method.id,
                                    cost: method.cost,
                                  })
                                }
                                className="accent-gold"
                              />
                              <div>
                                <p className="text-sm font-bold">{method.name}</p>
                                <p className="text-xs text-graphite">{method.days}</p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-gold">
                              KES {method.cost.toLocaleString()}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-sm tracking-widest uppercase font-bold"
                  data-testid="continue-to-payment"
                >
                  Continue to Payment
                </button>
              </form>
            )}

            {step === 2 && (
              <div>
                <div className="bg-card border-2 border-gold/20 p-8 mb-8">
                  <h2 className="font-serif text-2xl text-charcoal mb-6">
                    Payment Method
                  </h2>

                  <div className="space-y-4 mb-6">
                    <label className="flex items-center justify-between p-4 border-2 border-gold bg-secondary cursor-pointer">
                      <div className="flex items-center space-x-3">
                        <input
                          type="radio"
                          name="payment"
                          checked={paymentMethod === "mpesa"}
                          onChange={() => setPaymentMethod("mpesa")}
                          className="accent-gold"
                        />
                        <Smartphone size={24} className="text-gold" />
                        <div>
                          <p className="text-sm font-bold">M-Pesa</p>
                          <p className="text-xs text-graphite">Pay with your phone</p>
                        </div>
                      </div>
                    </label>
                  </div>

                  {paymentMethod === "mpesa" && (
                    <div className="bg-secondary p-6 border border-gold/20">
                      <label className="block text-sm font-bold mb-2 tracking-widest uppercase">
                        M-Pesa Phone Number
                      </label>
                      <input
                        type="tel"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        placeholder="+254 7XX XXX XXX"
                        className="w-full px-4 py-3 border-b-2 border-gold/30 focus:border-gold bg-transparent focus:ring-0 mb-4"
                        data-testid="mpesa-phone"
                      />

                      <div className="bg-pearl p-4 border-l-4 border-gold">
                        <p className="text-xs text-charcoal mb-2">
                          <strong>How it works:</strong>
                        </p>
                        <ol className="text-xs text-graphite space-y-1 list-decimal list-inside">
                          <li>Enter your M-Pesa registered phone number</li>
                          <li>You’ll receive an STK Push prompt on your phone</li>
                          <li>Enter your M-Pesa PIN to confirm payment</li>
                          <li>Wait for confirmation</li>
                        </ol>
                      </div>

                      <div className="mt-4 p-3 bg-midnight/5 border border-midnight/20">
                        <p className="text-xs text-midnight flex items-start space-x-2">
                          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Demo Mode:</strong> This is a mock M-Pesa integration for
                            testing. In production, you’ll need Safaricom API credentials.
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 py-4 border border-gold text-charcoal hover:bg-secondary transition-all duration-300 text-sm tracking-widest uppercase font-bold"
                    type="button"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={processingPayment}
                    className="flex-1 py-4 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-sm tracking-widest uppercase font-bold disabled:opacity-50 flex items-center justify-center space-x-2"
                    data-testid="pay-button"
                    type="button"
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <span>Pay KES {totals.total.toLocaleString()}</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && order && (
              <div className="bg-card border-2 border-gold/20 p-8">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gold mx-auto mb-6 flex items-center justify-center">
                    <Check size={32} className="text-white" />
                  </div>

                  <h2 className="font-serif text-3xl text-charcoal mb-3">
                    Order Confirmed
                  </h2>

                  <p className="text-sm text-graphite mb-6">
                    Save this order number — you’ll use it to track delivery.
                  </p>

                  <div className="inline-flex items-center gap-3 bg-secondary px-6 py-4 border-2 border-gold mb-3">
                    <p className="text-2xl font-serif text-gold tracking-wider">
                      {order.orderNumber}
                    </p>
                    <button
                      onClick={handleCopyOrderNumber}
                      type="button"
                      className="p-2 border border-gold/30 hover:border-gold hover:bg-charcoal/5"
                      title="Copy order number"
                    >
                      <CopyIcon size={18} />
                    </button>
                  </div>

                  <p className="text-xs text-graphite mb-8">
                    If you close this page, you can still track using the Order Number.
                  </p>

                  <div className="flex flex-col md:flex-row gap-3 justify-center">
                    <button
                      onClick={handleGoToTracking}
                      className="px-6 py-4 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-sm tracking-widest uppercase font-bold"
                      type="button"
                      data-testid="go-to-tracking"
                    >
                      Track This Order
                    </button>

                    <button
                      onClick={() => window.print()}
                      className="px-6 py-4 border border-gold text-charcoal hover:bg-secondary transition-all duration-300 text-sm tracking-widest uppercase font-bold"
                      type="button"
                    >
                      Print Receipt
                    </button>

                    <button
                      onClick={() => navigate("/")}
                      className="px-6 py-4 border border-gold/40 text-charcoal hover:bg-secondary transition-all duration-300 text-sm tracking-widest uppercase font-bold"
                      type="button"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>

                <div className="mt-10 grid md:grid-cols-3 gap-4">
                  <div className="border border-gold/20 p-4">
                    <p className="text-xs tracking-widest uppercase text-graphite mb-2">
                      Contact
                    </p>
                    <p className="text-sm text-charcoal font-semibold">{customerInfo.name}</p>
                    <p className="text-sm text-graphite inline-flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4" /> {safeStr(customerInfo.phone)}
                    </p>
                  </div>

                  <div className="border border-gold/20 p-4">
                    <p className="text-xs tracking-widest uppercase text-graphite mb-2">
                      Delivery
                    </p>
                    <p className="text-sm text-charcoal inline-flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span>
                        {safeStr(deliveryInfo.address)} <br />
                        {safeStr(deliveryInfo.city)}, {safeStr(deliveryInfo.county)}
                      </span>
                    </p>
                    <p className="text-xs text-graphite mt-2">
                      Method: {deliveryInfo.method} • Shipping: KES{" "}
                      {safeNum(deliveryInfo.cost || 0, 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="border border-gold/20 p-4">
                    <p className="text-xs tracking-widest uppercase text-graphite mb-2">
                      Payment
                    </p>
                    <p className="text-sm text-charcoal font-semibold">M-Pesa</p>
                    <p className="text-xs text-graphite mt-1">
                      Status: <span className="font-semibold text-charcoal">confirmed</span>
                    </p>
                    <p className="text-xs text-graphite mt-2">
                      Total:{" "}
                      <span className="font-semibold text-gold">
                        KES {totals.total.toLocaleString()}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="bg-card border-2 border-gold/20 p-8 sticky top-24">
              <h2 className="font-serif text-2xl text-charcoal mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6">
                {safeArr(cart?.items).map((item, idx) => {
                  const product = products?.[item.productId];
                  if (!product) return null;

                  const variant = safeArr(product.variants).find((v) => v?.id === item.variantId);

                  const price = safeNum(product.salePrice || product.basePrice || 0, 0);
                  const itemPrice = price + safeNum(variant?.priceAdjustment || 0, 0);

                  const img = absolutizeMaybe(pickDefaultImage(product));

                  return (
                    <div key={idx} className="flex space-x-4 pb-4 border-b border-gold/20">
                      {img ? (
                        <img
                          src={img}
                          alt={product.name}
                          className="w-16 h-16 object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 border border-gold/20 bg-black/5" />
                      )}

                      <div className="flex-1">
                        <p className="text-sm font-bold text-charcoal">{product.name}</p>
                        <p className="text-xs text-graphite">
                          {variant?.color || "Default"} × {safeNum(item.quantity || 0, 0)}
                        </p>
                        {item.giftWrap && <p className="text-xs text-gold">+ Gift wrap</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          KES {(itemPrice * safeNum(item.quantity || 0, 0)).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 pb-6 border-b-2 border-gold/20">
                <div className="flex justify-between text-sm">
                  <span className="text-graphite">Subtotal</span>
                  <span className="text-charcoal font-bold">
                    KES {safeNum(totals.subtotal || 0, 0).toLocaleString()}
                  </span>
                </div>

                {safeNum(totals.giftWrapTotal || 0, 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-graphite">Gift Wrap</span>
                    <span className="text-charcoal font-bold">
                      KES {safeNum(totals.giftWrapTotal || 0, 0).toLocaleString()}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-graphite">Shipping</span>
                  <span className="text-charcoal font-bold">
                    KES {safeNum(totals.shippingCost || 0, 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-xl pt-6">
                <span className="font-serif text-charcoal">Total</span>
                <span className="font-serif text-gold font-bold">
                  KES {safeNum(totals.total || 0, 0).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-graphite mt-10">
          Tip: After checkout, use “Track This Order” to view live status updates.
        </p>
      </div>
    </div>
  );
}