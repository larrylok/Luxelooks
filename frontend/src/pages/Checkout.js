import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2, AlertCircle, CreditCard, Smartphone } from "lucide-react";
import axios from "axios";
import storage from "@/utils/storage";
import analytics from "@/utils/analytics";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
  }, []);

  const loadCart = async () => {
    setLoading(true);
    const cartData = await storage.get("cart");
    
    if (!cartData || cartData.items.length === 0) {
      toast.error("Your cart is empty");
      navigate("/");
      return;
    }

    setCart(cartData);

    // Load product details
    const productPromises = cartData.items.map((item) =>
      axios.get(`${API}/products/${item.productId}`)
    );

    try {
      const responses = await Promise.all(productPromises);
      const productsMap = {};
      responses.forEach((res) => {
        productsMap[res.data.id] = res.data;
      });
      setProducts(productsMap);
    } catch (error) {
      console.error("Error loading products:", error);
    }

    setLoading(false);
  };

  const calculateCartTotals = () => {
    let subtotal = 0;
    let giftWrapTotal = 0;

    cart?.items.forEach((item) => {
      const product = products[item.productId];
      if (product) {
        const variant = product.variants.find((v) => v.id === item.variantId);
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

    const shippingCost = deliveryInfo.cost;
    const total = subtotal + giftWrapTotal + shippingCost;

    return { subtotal, giftWrapTotal, shippingCost, total };
  };

  const handleCustomerInfoSubmit = (e) => {
    e.preventDefault();
    
    if (!customerInfo.name || !customerInfo.email || !customerInfo.phone) {
      toast.error("Please fill in all fields");
      return;
    }

    analytics.initiateCheckout(calculateCartTotals().total, cart.items.length);
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

    // Simulate payment processing
    setTimeout(async () => {
      try {
        const totals = calculateCartTotals();
        const orderNumber = `LX-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

        const orderData = {
          orderNumber,
          customer: customerInfo,
          delivery: deliveryInfo,
          items: cart.items,
          subtotal: totals.subtotal,
          giftWrapTotal: totals.giftWrapTotal,
          discount: 0,
          shippingCost: totals.shippingCost,
          total: totals.total,
          payment: {
            method: "M-Pesa",
            status: "confirmed",
            mpesaTransactionId: `MOCK${Date.now()}`,
            confirmedAt: new Date().toISOString(),
          },
          status: "pending",
          statusHistory: [
            {
              status: "pending",
              timestamp: new Date().toISOString(),
              note: "Order placed",
            },
          ],
        };

        const response = await axios.post(`${API}/orders`, orderData);
        setOrder(response.data);

        // Track purchase
        analytics.purchase(response.data.id, totals.total, cart.items);

        // Clear cart
        await storage.set("cart", { items: [], subtotal: 0, total: 0 });
        window.dispatchEvent(new Event("storage-update"));

        toast.success("Payment confirmed!");
        setStep(3);
      } catch (error) {
        console.error("Error creating order:", error);
        toast.error("Failed to process order");
      }

      setProcessingPayment(false);
    }, 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="inline-block w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totals = calculateCartTotals();

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-6 md:px-12 lg:px-24 max-w-[1400px]">
        <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-charcoal mb-8">
          Checkout
        </h1>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-4">
            <div
              className={`flex items-center justify-center w-10 h-10 border-2 ${
                step >= 1 ? "border-gold bg-gold text-white" : "border-gold/30"
              }`}
            >
              {step > 1 ? <Check size={20} /> : <span>1</span>}
            </div>
            <div className={`h-0.5 w-24 ${step >= 2 ? "bg-gold" : "bg-gold/30"}`}></div>
            <div
              className={`flex items-center justify-center w-10 h-10 border-2 ${
                step >= 2 ? "border-gold bg-gold text-white" : "border-gold/30"
              }`}
            >
              {step > 2 ? <Check size={20} /> : <span>2</span>}
            </div>
            <div className={`h-0.5 w-24 ${step >= 3 ? "bg-gold" : "bg-gold/30"}`}></div>
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
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Step 1: Customer & Delivery Info */}
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
                          { id: "standard", name: "Standard Delivery", days: "3-5 business days", cost: 500 },
                          { id: "express", name: "Express Delivery", days: "1-2 business days", cost: 1500 },
                          { id: "overnight", name: "Overnight Delivery", days: "Next business day", cost: 3000 },
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

            {/* Step 2: Payment */}
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
                          <li>You'll receive an STK Push prompt on your phone</li>
                          <li>Enter your M-Pesa PIN to confirm payment</li>
                          <li>Wait for confirmation</li>
                        </ol>
                      </div>

                      <div className="mt-4 p-3 bg-midnight/5 border border-midnight/20">
                        <p className="text-xs text-midnight flex items-start space-x-2">
                          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Demo Mode:</strong> This is a mock M-Pesa integration for testing. 
                            In production, you'll need Safaricom API credentials. See documentation for setup.
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
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={processingPayment}
                    className="flex-1 py-4 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-sm tracking-widest uppercase font-bold disabled:opacity-50 flex items-center justify-center space-x-2"
                    data-testid="pay-button"
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>Pay KES {totals.total.toLocaleString()}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && order && (
              <div className="bg-card border-2 border-gold/20 p-8 text-center">
                <div className="w-16 h-16 bg-gold mx-auto mb-6 flex items-center justify-center">
                  <Check size={32} className="text-white" />
                </div>
                
                <h2 className="font-serif text-3xl text-charcoal mb-4">
                  Order Confirmed!
                </h2>
                
                <p className="text-lg text-graphite mb-8">
                  Thank you for your purchase. Your order number is:
                </p>
                
                <div className="inline-block bg-secondary px-8 py-4 border-2 border-gold mb-8">
                  <p className="text-2xl font-serif text-gold tracking-wider">
                    {order.orderNumber}
                  </p>
                </div>

                <p className="text-sm text-graphite mb-8">
                  We've sent a confirmation email to <strong>{customerInfo.email}</strong>
                </p>

                <div className="flex space-x-4">
                  <button
                    onClick={() => navigate("/")}
                    className="flex-1 py-4 border border-gold text-charcoal hover:bg-secondary transition-all duration-300 text-sm tracking-widest uppercase font-bold"
                  >
                    Continue Shopping
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="flex-1 py-4 bg-charcoal text-gold border border-gold hover:bg-transparent hover:text-charcoal transition-all duration-300 text-sm tracking-widest uppercase font-bold"
                  >
                    Print Receipt
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-card border-2 border-gold/20 p-8 sticky top-24">
              <h2 className="font-serif text-2xl text-charcoal mb-6">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                {cart?.items.map((item, idx) => {
                  const product = products[item.productId];
                  if (!product) return null;

                  const variant = product.variants.find((v) => v.id === item.variantId);
                  const price = product.salePrice || product.basePrice;
                  const itemPrice = price + (variant?.priceAdjustment || 0);

                  return (
                    <div key={idx} className="flex space-x-4 pb-4 border-b border-gold/20">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-16 h-16 object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-bold text-charcoal">{product.name}</p>
                        <p className="text-xs text-graphite">
                          {variant?.color} × {item.quantity}
                        </p>
                        {item.giftWrap && (
                          <p className="text-xs text-gold">+ Gift wrap</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">
                          KES {(itemPrice * item.quantity).toLocaleString()}
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
                    KES {totals.subtotal.toLocaleString()}
                  </span>
                </div>
                {totals.giftWrapTotal > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-graphite">Gift Wrap</span>
                    <span className="text-charcoal font-bold">
                      KES {totals.giftWrapTotal.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-graphite">Shipping</span>
                  <span className="text-charcoal font-bold">
                    KES {totals.shippingCost.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-xl pt-6">
                <span className="font-serif text-charcoal">Total</span>
                <span className="font-serif text-gold font-bold">
                  KES {totals.total.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
