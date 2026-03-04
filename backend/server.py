from fastapi import (
    FastAPI,
    APIRouter,
    HTTPException,
    Query,
    Header,
    Depends,
    Request,
    UploadFile,
    File,
)
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import os
import logging
import uuid
import hashlib
import re


# ==================== PATHS / ENV ====================

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Uploads directory (served at /uploads)
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", str(ROOT_DIR / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _safe_filename(name: str) -> str:
    # Keep only final file component, sanitize, keep reasonable length
    name = (name or "image").strip().replace("\\", "/").split("/")[-1]
    name = re.sub(r"[^a-zA-Z0-9._-]", "_", name)
    return name[:120] if name else "image"


# ==================== SECURITY HELPERS ====================

def _hash_pw(pw: str) -> str:
    return hashlib.sha256((pw or "").encode("utf-8")).hexdigest()


def _is_strong_password(pw: str) -> bool:
    return isinstance(pw, str) and len(pw.strip()) >= 10


def _phone_key(p: str) -> str:
    """
    Normalize phone for matching:
    - Keep digits only
    - Compare last 9 digits (Kenya-friendly: 07xxxxxxxx / +2547xxxxxxxx)
    """
    digits = re.sub(r"\D", "", str(p or ""))
    return digits[-9:] if len(digits) >= 9 else digits


def _public_order_view(order: Dict[str, Any]) -> Dict[str, Any]:
    """
    Customer-safe order view for public tracking:
    ✅ Keep customer-facing "note" messages in statusHistory
    ✅ Normalize time key to "at" (supports timestamp/at/time/createdAt)
    ✅ Hide adminNotes and sensitive payment reference
    ✅ Hide full delivery address (keep city/county/method/cost/trackingNumber)
    """
    if not order:
        return {}

    o = dict(order)
    o.pop("_id", None)
    o.pop("adminNotes", None)  # internal-only

    # delivery: hide address
    delivery = dict(o.get("delivery") or {})
    delivery.pop("address", None)
    o["delivery"] = delivery

    # payment: hide sensitive transaction id
    payment = dict(o.get("payment") or {})
    payment.pop("mpesaTransactionId", None)
    o["payment"] = payment

    # normalize status history
    raw_hist = o.get("statusHistory") or []
    safe_hist: List[Dict[str, Any]] = []
    if isinstance(raw_hist, list):
        for h in raw_hist:
            if not isinstance(h, dict):
                continue
            safe_hist.append(
                {
                    "status": h.get("status"),
                    "note": h.get("note"),
                    "at": h.get("at") or h.get("timestamp") or h.get("time") or h.get("createdAt"),
                }
            )
    o["statusHistory"] = safe_hist

    return o


# ==================== DB ====================

mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")

if not mongo_url:
    raise RuntimeError("Missing MONGO_URL in backend/.env")
if not db_name:
    raise RuntimeError("Missing DB_NAME in backend/.env")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


# ==================== APP ====================

app = FastAPI()

# Serve uploaded files publicly
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

api_router = APIRouter(prefix="/api")


# ==================== AUTH HELPERS ====================

def _get_bearer_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2:
        return None
    scheme, token = parts[0].strip(), parts[1].strip()
    if scheme.lower() != "bearer" or not token:
        return None
    return token


async def require_admin(
    request: Request,
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """
    Minimal admin guard:
    - Session stored in db.admin with { key: "session", value: { token, expiresAt } }
    - Client sends token via:
        1) Authorization: Bearer <token>
        2) Query param: ?token=<token> (keeps current frontend working)
    """
    token = _get_bearer_token(authorization)

    if not token:
        token = request.query_params.get("token")
        if token:
            token = token.strip()

    if not token:
        raise HTTPException(status_code=401, detail="Missing admin token")

    doc = await db.admin.find_one({"key": "session"}, {"_id": 0})
    if not doc or "value" not in doc:
        raise HTTPException(status_code=401, detail="No active admin session")

    sess = doc["value"]
    if sess.get("token") != token:
        raise HTTPException(status_code=401, detail="Invalid admin session")

    expires_raw = sess.get("expiresAt")
    if not expires_raw:
        raise HTTPException(status_code=401, detail="Invalid admin session expiry")

    try:
        expires_at = datetime.fromisoformat(str(expires_raw).replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid admin session expiry format")

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=401, detail="Admin session expired")

    return sess


async def optional_admin(
    request: Request,
    authorization: Optional[str] = Header(default=None),
) -> Optional[Dict[str, Any]]:
    try:
        return await require_admin(request=request, authorization=authorization)
    except HTTPException:
        return None


# ==================== MODELS ====================

class ProductVariant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    size: Optional[str] = None
    color: Optional[str] = None
    material: Optional[str] = None
    stock: int = 0
    sku: str
    priceAdjustment: float = 0.0


class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    shortDescription: str
    longDescription: str
    basePrice: float
    salePrice: Optional[float] = None
    discountPercentage: Optional[float] = None
    category: str
    collections: List[str] = []
    tags: List[str] = []
    images: List[str] = []
    variants: List[ProductVariant] = []
    status: str = "active"
    isFeatured: bool = False
    isBestseller: bool = False
    isNewArrival: bool = False
    allowPreorder: bool = False
    giftWrapAvailable: bool = True
    giftWrapCost: float = 500.0
    materials: Optional[str] = None
    weight: Optional[str] = None
    dimensions: Optional[str] = None
    careInstructions: Optional[str] = None
    sizeGuideId: Optional[str] = None
    relatedProductIds: List[str] = []
    bundleProductIds: List[str] = []
    averageRating: float = 0.0
    reviewCount: int = 0
    viewCount: int = 0
    addToCartCount: int = 0
    totalPurchases: int = 0
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class CartItem(BaseModel):
    productId: str
    variantId: str
    quantity: int
    giftWrap: bool = False
    giftMessage: Optional[str] = None
    giftReceipt: bool = False
    isPreorder: bool = False


class Cart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    items: List[CartItem] = []
    subtotal: float = 0.0
    giftWrapTotal: float = 0.0
    discount: float = 0.0
    shippingCost: float = 0.0
    total: float = 0.0


class CustomerInfo(BaseModel):
    name: str
    email: str
    phone: str
    isGuest: bool = False


class DeliveryInfo(BaseModel):
    address: str
    city: str
    county: str
    method: str
    cost: float
    trackingNumber: Optional[str] = None


class PaymentInfo(BaseModel):
    method: str = "M-Pesa"
    status: str = "pending"
    mpesaTransactionId: Optional[str] = None
    confirmedAt: Optional[str] = None


class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    orderNumber: str
    customer: CustomerInfo
    delivery: DeliveryInfo
    items: List[CartItem]
    subtotal: float
    giftWrapTotal: float
    discount: float
    shippingCost: float
    total: float
    payment: PaymentInfo
    status: str = "pending"
    statusHistory: List[Dict[str, Any]] = []
    adminNotes: Optional[str] = None
    courier: Optional[str] = None
    trackingUrl: Optional[str] = None
    packageWeight: Optional[str] = None
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    productId: str
    orderId: str
    customerId: str
    customerName: str
    rating: int
    title: str
    comment: str
    status: str = "pending"
    adminResponse: Optional[str] = None
    verifiedPurchase: bool = True
    createdAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updatedAt: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Collection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    description: str
    featured: bool = False
    heroImage: Optional[str] = None
    displayOrder: int = 0
    productIds: List[str] = []


class Settings(BaseModel):
    currencyRates: Dict[str, float] = {"KES": 1.0, "USD": 0.0077, "EUR": 0.0071}
    currencyRatesUpdated: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    shippingMethods: List[Dict[str, Any]] = []
    businessInfo: Dict[str, Any] = {}
    inventoryThreshold: int = 5
    allowPreorders: bool = True


class AdminLogin(BaseModel):
    password: str


class AdminSession(BaseModel):
    token: str
    expiresAt: str


# ==================== ENDPOINTS ====================

@api_router.get("/")
async def root():
    return {"message": "Luxe Looks API", "status": "active"}


# ==================== PRODUCTS ====================

@api_router.get("/products")
async def get_products(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = None,
    status: str = "active",
):
    query: Dict[str, Any] = {"status": status}
    if category:
        query["category"] = category
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"shortDescription": {"$regex": search, "$options": "i"}},
        ]

    skip = (page - 1) * limit
    total = await db.products.count_documents(query)

    sort_field = "createdAt"
    sort_order = -1
    if sort == "price_asc":
        sort_field = "basePrice"
        sort_order = 1
    elif sort == "price_desc":
        sort_field = "basePrice"
        sort_order = -1
    elif sort == "name":
        sort_field = "name"
        sort_order = 1

    products = (
        await db.products.find(query, {"_id": 0})
        .sort(sort_field, sort_order)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )

    return {
        "products": products,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    await db.products.update_one({"id": product_id}, {"$inc": {"viewCount": 1}})
    product["viewCount"] = product.get("viewCount", 0) + 1
    return product


@api_router.post("/products")
async def create_product(product: Product, session: Dict[str, Any] = Depends(require_admin)):
    product_dict = product.dict()
    now_iso = datetime.now(timezone.utc).isoformat()
    product_dict["createdAt"] = product_dict.get("createdAt") or now_iso
    product_dict["updatedAt"] = now_iso
    await db.products.insert_one(product_dict)
    return product_dict


@api_router.put("/products/{product_id}")
async def update_product(product_id: str, product: Product, session: Dict[str, Any] = Depends(require_admin)):
    product_dict = product.dict()
    product_dict["updatedAt"] = datetime.now(timezone.utc).isoformat()
    result = await db.products.update_one({"id": product_id}, {"$set": product_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_dict


@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, session: Dict[str, Any] = Depends(require_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}


# ============================ ORDERS ============================

@api_router.post("/orders")
async def create_order(order: Order):
    order_dict = order.dict()
    now_iso = datetime.now(timezone.utc).isoformat()

    order_dict["createdAt"] = order_dict.get("createdAt") or now_iso
    order_dict["updatedAt"] = now_iso
    if not isinstance(order_dict.get("statusHistory"), list):
        order_dict["statusHistory"] = []

    await db.orders.insert_one(order_dict)
    return order_dict


# ==================== PUBLIC ORDER TRACKING (NO LOGIN) ====================

@api_router.get("/orders/track/{order_number}")
async def track_order_public(order_number: str):
    order_number = (order_number or "").strip()
    if not order_number:
        raise HTTPException(status_code=400, detail="Missing order number")

    order = await db.orders.find_one({"orderNumber": order_number}, {"_id": 0})

    if not order:
        order = await db.orders.find_one(
            {"orderNumber": {"$regex": f"^{re.escape(order_number)}$", "$options": "i"}},
            {"_id": 0},
        )

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return _public_order_view(order)


# ==================== ADMIN ORDER MANAGEMENT ====================

@api_router.get("/orders")
async def get_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    session: Dict[str, Any] = Depends(require_admin),
):
    skip = (page - 1) * limit
    total = await db.orders.count_documents({})
    orders = (
        await db.orders.find({}, {"_id": 0})
        .sort("createdAt", -1)
        .skip(skip)
        .limit(limit)
        .to_list(limit)
    )
    return {
        "orders": orders,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, session: Dict[str, Any] = Depends(require_admin)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@api_router.put("/orders/{order_id}")
async def update_order(
    order_id: str,
    updates: Dict[str, Any],
    session: Dict[str, Any] = Depends(require_admin),
):
    allowed = {
        "status",
        "adminNotes",
        "courier",
        "trackingUrl",
        "delivery",
        "payment",
        "statusHistory",
        "packageWeight",
    }

    updates = updates or {}
    safe_updates = {k: v for k, v in updates.items() if k in allowed}

    current = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Order not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    safe_updates["updatedAt"] = now_iso

    new_status = safe_updates.get("status")
    old_status = current.get("status")

    if new_status and new_status != old_status:
    # If frontend already provided statusHistory, trust it.
      if "statusHistory" not in safe_updates:
        history = current.get("statusHistory") or []
        if not isinstance(history, list):
            history = []
        history.append({"status": new_status, "at": now_iso, "note": None})
        safe_updates["statusHistory"] = history

    result = await db.orders.update_one({"id": order_id}, {"$set": safe_updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    return {"message": "Order updated"}


# ============================ REVIEWS ============================

@api_router.post("/reviews")
async def create_review(review: Review):
    review_dict = review.dict()
    review_dict["status"] = "pending"
    review_dict["createdAt"] = datetime.now(timezone.utc).isoformat()
    review_dict["updatedAt"] = datetime.now(timezone.utc).isoformat()

    await db.reviews.insert_one(review_dict)
    return review_dict


@api_router.get("/reviews")
async def get_reviews(
    productId: Optional[str] = None,
    status: Optional[str] = None,
    session: Optional[Dict[str, Any]] = Depends(optional_admin),
):
    query: Dict[str, Any] = {}
    if productId:
        query["productId"] = productId

    is_admin = bool(session)

    if is_admin:
        if status:
            query["status"] = status
    else:
        query["status"] = "approved"

    reviews = await db.reviews.find(query, {"_id": 0}).sort("createdAt", -1).to_list(1000)
    return reviews


@api_router.put("/reviews/{review_id}")
async def update_review(review_id: str, updates: Dict[str, Any], session: Dict[str, Any] = Depends(require_admin)):
    updates = updates or {}
    updates["updatedAt"] = datetime.now(timezone.utc).isoformat()
    result = await db.reviews.update_one({"id": review_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")

    if updates.get("status") == "approved":
        review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
        if review:
            approved_reviews = await db.reviews.find(
                {"productId": review["productId"], "status": "approved"},
                {"_id": 0},
            ).to_list(1000)

            if approved_reviews:
                avg_rating = sum(r.get("rating", 0) for r in approved_reviews) / len(approved_reviews)
                await db.products.update_one(
                    {"id": review["productId"]},
                    {"$set": {"averageRating": round(avg_rating, 1), "reviewCount": len(approved_reviews)}},
                )

    return {"message": "Review updated"}


# ============================ COLLECTIONS ============================

@api_router.get("/collections")
async def list_collections(session: Dict[str, Any] = Depends(require_admin)):
    collections = await db.collections.find({}, {"_id": 0}).sort("displayOrder", 1).to_list(100)
    return collections


@api_router.post("/collections")
async def create_collection(collection: Collection, session: Dict[str, Any] = Depends(require_admin)):
    collection_dict = collection.dict()
    await db.collections.insert_one(collection_dict)
    return collection_dict


@api_router.put("/collections/{collection_id}")
async def update_collection(collection_id: str, collection: Collection, session: Dict[str, Any] = Depends(require_admin)):
    collection_dict = collection.dict()
    result = await db.collections.update_one({"id": collection_id}, {"$set": collection_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection_dict


# ============================ SETTINGS ============================

@api_router.get("/settings")
async def get_settings():
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        default_settings = Settings().dict()
        await db.settings.insert_one(default_settings)
        return default_settings
    return settings


@api_router.put("/settings")
async def update_settings(settings: Settings, session: Dict[str, Any] = Depends(require_admin)):
    settings_dict = settings.dict()
    await db.settings.update_one({}, {"$set": settings_dict}, upsert=True)
    return settings_dict


# ==================== ADMIN AUTH ====================

class AdminChangePassword(BaseModel):
    currentPassword: str
    newPassword: str
    confirmPassword: str


class AdminRecoveryReset(BaseModel):
    recoveryKey: str
    newPassword: str
    confirmPassword: str


@api_router.post("/admin/change-password")
async def admin_change_password(payload: AdminChangePassword, session: Dict[str, Any] = Depends(require_admin)):
    stored = await db.admin.find_one({"key": "password"}, {"_id": 0})
    if not stored or "value" not in stored:
        raise HTTPException(status_code=500, detail="Admin password not initialized")

    cur = (payload.currentPassword or "").strip()
    new = (payload.newPassword or "").strip()
    conf = (payload.confirmPassword or "").strip()

    if not cur or not new or not conf:
        raise HTTPException(status_code=400, detail="All fields are required")

    if new != conf:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if not _is_strong_password(new):
        raise HTTPException(status_code=400, detail="New password must be at least 10 characters")

    current_hash = _hash_pw(cur)
    if current_hash != stored["value"]:
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    new_hash = _hash_pw(new)
    await db.admin.update_one(
        {"key": "password"},
        {"$set": {"key": "password", "value": new_hash}},
        upsert=True,
    )

    await db.admin.delete_one({"key": "session"})
    return {"message": "Password changed. Please login again."}


@api_router.post("/admin/recovery-reset-password")
async def admin_recovery_reset_password(payload: AdminRecoveryReset):
    expected = (os.environ.get("ADMIN_RECOVERY_KEY") or "").strip()
    if not expected:
        raise HTTPException(status_code=500, detail="ADMIN_RECOVERY_KEY not configured on server")

    key = (payload.recoveryKey or "").strip()
    new = (payload.newPassword or "").strip()
    conf = (payload.confirmPassword or "").strip()

    if key != expected:
        raise HTTPException(status_code=401, detail="Invalid recovery key")

    if not new or not conf:
        raise HTTPException(status_code=400, detail="New password fields are required")

    if new != conf:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    if not _is_strong_password(new):
        raise HTTPException(status_code=400, detail="New password must be at least 10 characters")

    await db.admin.update_one(
        {"key": "password"},
        {"$set": {"key": "password", "value": _hash_pw(new)}},
        upsert=True,
    )

    await db.admin.delete_one({"key": "session"})
    return {"message": "Password reset successfully. Please login again."}


@api_router.post("/admin/login")
async def admin_login(login: AdminLogin):
    password_hash = _hash_pw(login.password)

    stored_hash = await db.admin.find_one({"key": "password"}, {"_id": 0})
    if not stored_hash or "value" not in stored_hash:
        raise HTTPException(
            status_code=500,
            detail="Admin password not initialized. Set it once in the database.",
        )

    if password_hash != stored_hash["value"]:
        raise HTTPException(status_code=401, detail="Invalid password")

    token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    session = {"token": token, "expiresAt": expires_at.isoformat()}

    await db.admin.update_one(
        {"key": "session"},
        {"$set": {"key": "session", "value": session}},
        upsert=True,
    )

    return session


@api_router.post("/admin/logout")
async def admin_logout(session: Dict[str, Any] = Depends(require_admin)):
    await db.admin.delete_one({"key": "session"})
    return {"message": "Logged out"}


@api_router.get("/admin/verify")
async def verify_admin(session: Dict[str, Any] = Depends(require_admin)):
    return {"valid": True}


# ============================ ANALYTICS ============================

@api_router.post("/analytics/track")
async def track_analytics(event: Dict[str, Any], session: Dict[str, Any] = Depends(require_admin)):
    if not isinstance(event, dict):
        raise HTTPException(status_code=400, detail="Invalid event payload")
    event["timestamp"] = datetime.now(timezone.utc).isoformat()
    await db.analytics.insert_one(event)
    return {"message": "Event tracked"}


# ============================ REPORTS ============================

@api_router.get("/reports/bestsellers")
async def get_bestsellers(limit: int = 10):
    products = (
        await db.products.find({"status": "active"}, {"_id": 0})
        .sort("totalPurchases", -1)
        .limit(limit)
        .to_list(limit)
    )
    return products


@api_router.get("/reports/revenue")
async def get_revenue(start_date: Optional[str] = None, end_date: Optional[str] = None):
    query: Dict[str, Any] = {"payment.status": "confirmed"}
    if start_date:
        query["createdAt"] = {"$gte": start_date}
    if end_date:
        if "createdAt" in query:
            query["createdAt"]["$lte"] = end_date
        else:
            query["createdAt"] = {"$lte": end_date}

    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)

    total_revenue = sum(order.get("total", 0) for order in orders)
    total_orders = len(orders)

    return {
        "totalRevenue": total_revenue,
        "totalOrders": total_orders,
        "averageOrderValue": (total_revenue / total_orders) if total_orders > 0 else 0,
        "orders": orders,
    }


# ============================ UPLOADS ============================

@api_router.post("/admin/upload-image")
async def admin_upload_image(
    file: UploadFile = File(...),
    session: Dict[str, Any] = Depends(require_admin),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large (max 8MB)")

    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }

    ext = ext_map[file.content_type]
    original = _safe_filename(file.filename or "image")
    base = os.path.splitext(original)[0] or "image"
    filename = f"{base}_{uuid.uuid4().hex}{ext}"
    filepath = str(UPLOAD_DIR / filename)

    with open(filepath, "wb") as f:
        f.write(data)

    return {"url": f"/uploads/{filename}"}


# ==================== WIRE-UP / MIDDLEWARE ====================

app.include_router(api_router)


def _parse_cors_origins(raw: str) -> List[str]:
    raw = (raw or "").strip()
    if not raw:
        return ["http://localhost:3000"]
    # allow comma-separated
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return origins if origins else ["http://localhost:3000"]


cors_raw = os.environ.get("CORS_ORIGINS", "").strip()
cors_origins = _parse_cors_origins(cors_raw)

# If wildcard is used, credentials must be disabled
allow_credentials = True
if len(cors_origins) == 1 and cors_origins[0] == "*":
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_credentials=allow_credentials,
    allow_origins=cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()