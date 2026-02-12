import React, { useState, useEffect } from "react";
import { Search, Check, X, MessageSquare, Star } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [selectedReview, setSelectedReview] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");

  useEffect(() => {
    loadReviews();
    loadProducts();
  }, [filterStatus]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;

      const response = await axios.get(`${API}/reviews`, { params });
      setReviews(response.data || []);
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast.error("Failed to load reviews");
    }
    setLoading(false);
  };

  const loadProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`, {
        params: { limit: 100 },
      });
      const productsMap = {};
      response.data.products.forEach((p) => {
        productsMap[p.id] = p;
      });
      setProducts(productsMap);
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await axios.put(`${API}/reviews/${reviewId}`, {
        status: "approved",
      });
      toast.success("Review approved");
      loadReviews();
    } catch (error) {
      console.error("Error approving review:", error);
      toast.error("Failed to approve review");
    }
  };

  const handleRejectReview = async (reviewId) => {
    if (!window.confirm("Are you sure you want to reject this review?")) return;

    try {
      await axios.put(`${API}/reviews/${reviewId}`, {
        status: "rejected",
      });
      toast.success("Review rejected");
      loadReviews();
    } catch (error) {
      console.error("Error rejecting review:", error);
      toast.error("Failed to reject review");
    }
  };

  const handleOpenResponseModal = (review) => {
    setSelectedReview(review);
    setAdminResponse(review.adminResponse || "");
    setShowModal(true);
  };

  const handleSaveResponse = async () => {
    if (!selectedReview) return;

    try {
      await axios.put(`${API}/reviews/${selectedReview.id}`, {
        adminResponse,
        status: "approved", // Auto-approve when responding
      });
      toast.success("Response saved and review approved");
      setShowModal(false);
      loadReviews();
    } catch (error) {
      console.error("Error saving response:", error);
      toast.error("Failed to save response");
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            className={star <= rating ? "fill-gold text-gold" : "text-gold/30"}
          />
        ))}
      </div>
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-secondary text-charcoal";
      case "approved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-destructive/20 text-destructive";
      default:
        return "bg-secondary text-charcoal";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-4xl text-charcoal mb-2">Reviews Moderation</h1>
          <p className="text-graphite">{reviews.length} reviews</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-gold/20 p-6 mb-8">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-bold">Filter by Status:</label>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterStatus("pending")}
              className={`px-4 py-2 text-sm ${
                filterStatus === "pending"
                  ? "bg-gold text-white"
                  : "border border-gold/30 hover:bg-secondary"
              }`}
            >
              Pending ({reviews.filter((r) => r.status === "pending").length})
            </button>
            <button
              onClick={() => setFilterStatus("approved")}
              className={`px-4 py-2 text-sm ${
                filterStatus === "approved"
                  ? "bg-gold text-white"
                  : "border border-gold/30 hover:bg-secondary"
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilterStatus("rejected")}
              className={`px-4 py-2 text-sm ${
                filterStatus === "rejected"
                  ? "bg-gold text-white"
                  : "border border-gold/30 hover:bg-secondary"
              }`}
            >
              Rejected
            </button>
            <button
              onClick={() => setFilterStatus("")}
              className={`px-4 py-2 text-sm ${
                filterStatus === ""
                  ? "bg-gold text-white"
                  : "border border-gold/30 hover:bg-secondary"
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block w-12 h-12 border-2 border-gold border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-20 bg-card border border-gold/20">
          <Star size={48} className="mx-auto text-gold/30 mb-4" />
          <p className="text-graphite">No reviews found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const product = products[review.productId];
            return (
              <div
                key={review.id}
                className="bg-card border border-gold/20 p-6 hover:border-gold transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4 flex-1">
                    {product && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-20 h-20 object-cover"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-bold text-lg">{product?.name || "Product"}</h3>
                        <span
                          className={`px-2 py-1 text-xs tracking-widest uppercase ${getStatusColor(
                            review.status
                          )}`}
                        >
                          {review.status}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mb-3">
                        {renderStars(review.rating)}
                        <span className="text-sm text-graphite">
                          by {review.customerName}
                        </span>
                        <span className="text-xs text-graphite">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                        {review.verifiedPurchase && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs">
                            Verified Purchase
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold mb-2">{review.title}</p>
                      <p className="text-sm text-graphite leading-relaxed mb-3">
                        {review.comment}
                      </p>

                      {review.adminResponse && (
                        <div className="bg-secondary p-4 border-l-4 border-gold mt-4">
                          <p className="text-xs font-bold mb-2 tracking-widest uppercase">
                            Admin Response:
                          </p>
                          <p className="text-sm">{review.adminResponse}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    {review.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApproveReview(review.id)}
                          className="p-2 bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center space-x-2"
                          title="Approve"
                        >
                          <Check size={16} />
                          <span className="text-xs">Approve</span>
                        </button>
                        <button
                          onClick={() => handleRejectReview(review.id)}
                          className="p-2 bg-destructive text-white hover:bg-destructive/90 transition-colors flex items-center space-x-2"
                          title="Reject"
                        >
                          <X size={16} />
                          <span className="text-xs">Reject</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleOpenResponseModal(review)}
                      className="p-2 border border-gold hover:bg-secondary transition-colors flex items-center space-x-2"
                      title="Respond"
                    >
                      <MessageSquare size={16} />
                      <span className="text-xs">Respond</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Response Modal */}
      {showModal && selectedReview && (
        <>
          <div
            className="fixed inset-0 bg-charcoal/60 z-50"
            onClick={() => setShowModal(false)}
          />
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="min-h-screen px-4 flex items-center justify-center">
              <div className="bg-card border-2 border-gold p-8 max-w-2xl w-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl text-charcoal">
                    Respond to Review
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-2xl"
                  >
                    &times;
                  </button>
                </div>

                {/* Review Details */}
                <div className="bg-secondary p-4 mb-6 border border-gold/20">
                  <div className="flex items-center space-x-2 mb-3">
                    {renderStars(selectedReview.rating)}
                    <span className="text-sm font-bold">
                      {selectedReview.customerName}
                    </span>
                  </div>
                  <p className="text-sm font-bold mb-2">{selectedReview.title}</p>
                  <p className="text-sm text-graphite">{selectedReview.comment}</p>
                </div>

                {/* Response Input */}
                <div className="mb-6">
                  <label className="block text-sm font-bold mb-2">
                    Your Response
                  </label>
                  <textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="Thank you for your review..."
                    className="w-full px-4 py-3 border border-gold/30 bg-transparent focus:border-gold focus:ring-0"
                    rows={6}
                  />
                </div>

                {/* Actions */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 border border-gold text-charcoal hover:bg-secondary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveResponse}
                    className="flex-1 py-3 bg-gold text-white hover:bg-gold/90 transition-colors"
                  >
                    Save Response & Approve
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
