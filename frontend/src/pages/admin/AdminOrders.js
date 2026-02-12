import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Eye, Package, Truck, Check } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const [fulfillmentData, setFulfillmentData] = useState({
    courier: "",
    trackingUrl: "",
    packageWeight: "",
  });

  useEffect(() => {
    loadOrders();
  }, [filterStatus]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/orders`, {
        params: { limit: 100 },
      });
      setOrders(response.data.orders || []);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load orders");
    }
    setLoading(false);
  };

  const handleViewOrder = async (orderId) => {
    try {
      const response = await axios.get(`${API}/orders/${orderId}`);
      setSelectedOrder(response.data);
      setFulfillmentData({
        courier: response.data.courier || "",
        trackingUrl: response.data.trackingUrl || "",
        packageWeight: response.data.packageWeight || "",
      });
      setShowModal(true);
    } catch (error) {
      console.error("Error loading order:", error);
      toast.error("Failed to load order details");
    }
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}`, {
        status: newStatus,
        statusHistory: [
          ...(selectedOrder?.statusHistory || []),
          {
            status: newStatus,
            timestamp: new Date().toISOString(),
            note: `Status updated to ${newStatus}`,
          },
        ],
      });
      toast.success(`Order status updated to ${newStatus}`);
      loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        handleViewOrder(orderId);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleUpdateFulfillment = async () => {
    if (!selectedOrder) return;

    try {
      await axios.put(`${API}/orders/${selectedOrder.id}`, {
        ...fulfillmentData,
        status: "shipped",
        statusHistory: [
          ...(selectedOrder.statusHistory || []),
          {
            status: "shipped",
            timestamp: new Date().toISOString(),
            note: `Shipped via ${fulfillmentData.courier}`,
          },
        ],
      });
      toast.success("Fulfillment details updated");
      setShowModal(false);
      loadOrders();
    } catch (error) {
      console.error("Error updating fulfillment:", error);
      toast.error("Failed to update fulfillment details");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-secondary text-charcoal";
      case "processing":
        return "bg-gold/20 text-gold";
      case "shipped":
        return "bg-gold/10 text-charcoal";
      case "delivered":
        return "bg-green-100 text-green-700";
      case "cancelled":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-secondary text-charcoal";
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-4xl text-charcoal mb-2">Orders</h1>
          <p className="text-graphite">{orders.length} total orders</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-card border border-gold/20 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search
                size={20}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-graphite"
              />
              <input
                type="text"
                placeholder="Search by order number, customer name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-card border border-gold/20">
          <Package size={48} className="mx-auto text-gold/30 mb-4" />
          <p className="text-graphite">No orders found</p>
        </div>
      ) : (
        <div className="bg-card border border-gold/20 overflow-x-auto">
          <table className="w-full">
            <thead className="bg-charcoal text-ivory">
              <tr>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Order #</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Customer</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Date</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Items</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Total</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Status</th>
                <th className="p-4 text-left text-xs tracking-widest uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-t border-gold/20 hover:bg-secondary/50">
                  <td className="p-4">
                    <p className="font-bold text-charcoal">{order.orderNumber}</p>
                    <p className="text-xs text-graphite">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm font-bold">{order.customer.name}</p>
                    <p className="text-xs text-graphite">{order.customer.email}</p>
                    <p className="text-xs text-graphite">{order.customer.phone}</p>
                  </td>
                  <td className="p-4 text-sm">
                    {new Date(order.createdAt).toLocaleDateString("en-KE", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="p-4 text-sm">{order.items.length} items</td>
                  <td className="p-4">
                    <p className="font-bold text-gold">KES {order.total.toLocaleString()}</p>
                    <p className="text-xs text-graphite">{order.payment.method}</p>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs tracking-widest uppercase ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewOrder(order.id)}
                        className="p-2 hover:bg-secondary transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      {order.status === "pending" && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, "processing")}
                          className="p-2 hover:bg-secondary transition-colors text-gold"
                          title="Mark as Processing"
                        >
                          <Package size={16} />
                        </button>
                      )}
                      {order.status === "processing" && (
                        <button
                          onClick={() => handleViewOrder(order.id)}
                          className="p-2 hover:bg-secondary transition-colors text-midnight"
                          title="Ship Order"
                        >
                          <Truck size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Detail Modal */}
      {showModal && selectedOrder && (
        <>
          <div className="fixed inset-0 bg-charcoal/60 z-50" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="min-h-screen px-4 flex items-center justify-center">
              <div className="bg-card border-2 border-gold p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-3xl text-charcoal">Order Details</h2>
                  <button onClick={() => setShowModal(false)} className="text-2xl">&times;</button>
                </div>

                {/* Order Info */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-secondary p-4 border border-gold/20">
                    <p className="text-xs text-graphite mb-1">ORDER NUMBER</p>
                    <p className="font-bold text-lg">{selectedOrder.orderNumber}</p>
                  </div>
                  <div className="bg-secondary p-4 border border-gold/20">
                    <p className="text-xs text-graphite mb-1">STATUS</p>
                    <span className={`px-3 py-1 text-xs tracking-widest uppercase ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>

                {/* Customer & Delivery */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-bold mb-3">Customer Information</h3>
                    <p className="text-sm mb-1"><strong>Name:</strong> {selectedOrder.customer.name}</p>
                    <p className="text-sm mb-1"><strong>Email:</strong> {selectedOrder.customer.email}</p>
                    <p className="text-sm mb-1"><strong>Phone:</strong> {selectedOrder.customer.phone}</p>
                  </div>
                  <div>
                    <h3 className="font-bold mb-3">Delivery Address</h3>
                    <p className="text-sm mb-1">{selectedOrder.delivery.address}</p>
                    <p className="text-sm mb-1">{selectedOrder.delivery.city}, {selectedOrder.delivery.county}</p>
                    <p className="text-sm"><strong>Method:</strong> {selectedOrder.delivery.method}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="mb-6">
                  <h3 className="font-bold mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="border border-gold/20 p-3 flex justify-between">
                        <div>
                          <p className="text-sm font-bold">Product ID: {item.productId}</p>
                          <p className="text-xs text-graphite">Variant: {item.variantId}</p>
                          <p className="text-xs">Quantity: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-secondary p-4 border border-gold/20 mb-6">
                  <div className="flex justify-between mb-2">
                    <span>Subtotal:</span>
                    <span className="font-bold">KES {selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  {selectedOrder.giftWrapTotal > 0 && (
                    <div className="flex justify-between mb-2">
                      <span>Gift Wrap:</span>
                      <span className="font-bold">KES {selectedOrder.giftWrapTotal.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between mb-2">
                    <span>Shipping:</span>
                    <span className="font-bold">KES {selectedOrder.shippingCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-gold/20 pt-2 mt-2">
                    <span>Total:</span>
                    <span className="text-gold">KES {selectedOrder.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Fulfillment Section */}
                {selectedOrder.status === "processing" && (
                  <div className="border-2 border-gold/20 p-6 mb-6">
                    <h3 className="font-bold mb-4 flex items-center space-x-2">
                      <Truck size={20} className="text-gold" />
                      <span>Fulfillment Details</span>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold mb-2">Courier Service</label>
                        <input
                          type="text"
                          value={fulfillmentData.courier}
                          onChange={(e) => setFulfillmentData({ ...fulfillmentData, courier: e.target.value })}
                          placeholder="e.g., DHL, G4S, Posta Kenya"
                          className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Tracking URL</label>
                        <input
                          type="url"
                          value={fulfillmentData.trackingUrl}
                          onChange={(e) => setFulfillmentData({ ...fulfillmentData, trackingUrl: e.target.value })}
                          placeholder="https://tracking-url.com/..."
                          className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-2">Package Weight</label>
                        <input
                          type="text"
                          value={fulfillmentData.packageWeight}
                          onChange={(e) => setFulfillmentData({ ...fulfillmentData, packageWeight: e.target.value })}
                          placeholder="e.g., 0.5kg"
                          className="w-full px-4 py-2 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                        />
                      </div>
                      <button
                        onClick={handleUpdateFulfillment}
                        className="w-full py-3 bg-gold text-white hover:bg-gold/90 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Check size={20} />
                        <span>Mark as Shipped</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Status Actions */}
                <div className="flex space-x-4">
                  {selectedOrder.status === "pending" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, "processing")}
                      className="flex-1 py-3 bg-gold text-white hover:bg-gold/90 transition-colors"
                    >
                      Mark as Processing
                    </button>
                  )}
                  {selectedOrder.status === "shipped" && (
                    <button
                      onClick={() => handleUpdateStatus(selectedOrder.id, "delivered")}
                      className="flex-1 py-3 bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      Mark as Delivered
                    </button>
                  )}
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-gold text-charcoal hover:bg-secondary transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
