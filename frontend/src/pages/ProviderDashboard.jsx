import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import ModeSwitcher from "../components/ModeSwitcher";
import VerificationModal from "../components/VerificationModal";
import "./Dashboard.css";

// Helper for category icons
const getCategoryIcon = (categoryName) => {
    const name = (categoryName || "").toLowerCase();
    if (name.includes("cook") || name.includes("chef") || name.includes("food")) return "🍳";
    if (name.includes("clean")) return "🧹";
    if (name.includes("beauty") || name.includes("spa") || name.includes("salon")) return "💅";
    if (name.includes("baby") || name.includes("child") || name.includes("care")) return "👶";
    if (name.includes("repair") || name.includes("electric") || name.includes("plumb")) return "🔧";
    if (name.includes("tech") || name.includes("web") || name.includes("code")) return "💻";
    if (name.includes("tutor") || name.includes("teach") || name.includes("book")) return "📚";
    return "🛠";
};

function ProviderDashboard() {
    const navigate = useNavigate();
    const { user, token, updateUser, logoutUser } = useAuth();

    // Active Sidebar Tab: "dashboard" | "services" | "bookings"
    const [activeTab, setActiveTab] = useState("dashboard");

    // Profile state
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileName, setProfileName] = useState(user?.name || "");
    const [profilePhone, setProfilePhone] = useState(user?.phone || "");
    const [profileAddress, setProfileAddress] = useState(user?.address || "");
    const [profileCity, setProfileCity] = useState(user?.city || user?.location?.city || "");
    const [profileState, setProfileState] = useState(user?.state || user?.location?.state || "");
    const [profilePincode, setProfilePincode] = useState(user?.pincode || user?.location?.pincode || "");
    const [profileCountry, setProfileCountry] = useState(user?.country || user?.location?.country || "India");
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [profileSuccess, setProfileSuccess] = useState("");

    // Feature 1: Provider Service Areas State
    const [serviceAreas, setServiceAreas] = useState([]);
    const [serviceAreasLoading, setServiceAreasLoading] = useState(false);
    const [newAreaCity, setNewAreaCity] = useState("");
    const [newAreaState, setNewAreaState] = useState("");
    const [newAreaPincode, setNewAreaPincode] = useState("");
    const [newAreaLocality, setNewAreaLocality] = useState("");
    const [areaActionLoading, setAreaActionLoading] = useState(false);
    const [areaActionError, setAreaActionError] = useState("");
    const [areaActionSuccess, setAreaActionSuccess] = useState("");

    // Member 2: Categories and Services State
    const [categories, setCategories] = useState([]);
    const [myServices, setMyServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(true);

    // Add Service Modal State
    const [showAddServiceModal, setShowAddServiceModal] = useState(false);
    const [newServiceName, setNewServiceName] = useState("");
    const [newServiceCategory, setNewServiceCategory] = useState("");
    const [newServicePrice, setNewServicePrice] = useState("");
    const [newServiceDuration, setNewServiceDuration] = useState("60");
    const [newServiceLocation, setNewServiceLocation] = useState(user?.address || "Bengaluru");
    const [newServiceImage, setNewServiceImage] = useState("");
    const [newServiceDescription, setNewServiceDescription] = useState("");
    const [serviceActionLoading, setServiceActionLoading] = useState(false);
    const [serviceActionError, setServiceActionError] = useState("");
    const [serviceActionSuccess, setServiceActionSuccess] = useState("");

    // Edit Service Modal State
    const [editingService, setEditingService] = useState(null);

    // Member 3: Provider Bookings State
    const [bookings, setBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(true);
    const [bookingFilterTab, setBookingFilterTab] = useState("all");
    const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);

    // Member 4: Payments State
    const [paymentsMap, setPaymentsMap] = useState({});

    // Feature 2: Verification Modal State
    const [showVerificationModal, setShowVerificationModal] = useState(false);

    // Feature 3: Service Image Upload State
    const [serviceImageUploading, setServiceImageUploading] = useState(false);
    const [serviceImagePreview, setServiceImagePreview] = useState("");

    // Feature 4: Portfolio State
    const [portfolio, setPortfolio] = useState([]);
    const [portfolioLoading, setPortfolioLoading] = useState(false);
    const [showAddPortfolioModal, setShowAddPortfolioModal] = useState(false);
    const [portfolioFile, setPortfolioFile] = useState(null);
    const [portfolioPreview, setPortfolioPreview] = useState("");
    const [portfolioCaption, setPortfolioCaption] = useState("");
    const [portfolioIsPrimary, setPortfolioIsPrimary] = useState(false);
    const [portfolioActionLoading, setPortfolioActionLoading] = useState(false);

    // Feature 5: Custom Requests State
    const [openRequests, setOpenRequests] = useState([]);
    const [openRequestsLoading, setOpenRequestsLoading] = useState(false);
    const [activeQuoteRequestId, setActiveQuoteRequestId] = useState(null);
    const [quoteAmount, setQuoteAmount] = useState("");
    const [quoteMessage, setQuoteMessage] = useState("");
    const [quoteDays, setQuoteDays] = useState("3");
    const [quoteSubmitting, setQuoteSubmitting] = useState(false);
    const [quoteSuccessMsg, setQuoteSuccessMsg] = useState("");

    // Initial Load
    useEffect(() => {
        fetchCategories();
        if (user?.id) {
            fetchMyServices();
            fetchPortfolio();
        }
        if (token) {
            fetchProviderBookings();
            fetchProviderPayments();
            fetchOpenRequests();
            fetchServiceAreas();
        }
    }, [user?.id, token]);

    const fetchCategories = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/categories");
            const data = await res.json();
            if (data.success && data.categories?.length > 0) {
                setCategories(data.categories);
                setNewServiceCategory(data.categories[0].category_id);
            }
        } catch (err) {
            console.error("Error loading categories:", err);
        }
    };

    const fetchMyServices = async () => {
        setServicesLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/services?provider_id=${user?.id}`);
            const data = await res.json();
            if (data.success) {
                setMyServices(data.services || []);
            }
        } catch (err) {
            console.error("Error loading provider services:", err);
        } finally {
            setServicesLoading(false);
        }
    };

    const fetchProviderBookings = async () => {
        if (!token) return;
        setBookingsLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/bookings/provider", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setBookings(data.bookings || []);
            }
        } catch (err) {
            console.error("Error loading provider bookings:", err);
        } finally {
            setBookingsLoading(false);
        }
    };

    const fetchProviderPayments = async () => {
        if (!token) return;
        try {
            const res = await fetch("http://localhost:5000/api/payments", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success && data.payments) {
                const pMap = {};
                data.payments.forEach((p) => {
                    pMap[p.booking_id] = p;
                });
                setPaymentsMap(pMap);
            }
        } catch (err) {
            console.error("Error loading provider payments:", err);
        }
    };

    // Upload service or portfolio image file
    const handleUploadImageFile = async (file) => {
        if (!file) return null;
        if (file.size > 5 * 1024 * 1024) {
            alert("File is too large. Maximum size is 5MB.");
            return null;
        }
        const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
        if (!validTypes.includes(file.type)) {
            alert("Only JPEG, PNG, WEBP, and GIF images are allowed.");
            return null;
        }

        const formData = new FormData();
        formData.append("image", file);

        const res = await fetch("http://localhost:5000/api/services/upload-image", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.message || "Failed to upload image.");
        }
        return data.imageUrl;
    };

    // Feature 4: Portfolio Fetch and Actions
    const fetchPortfolio = async () => {
        if (!user?.id) return;
        setPortfolioLoading(true);
        try {
            const res = await fetch(`http://localhost:5000/api/portfolio/${user.id}`);
            const data = await res.json();
            if (data.success) {
                setPortfolio(data.portfolio || []);
            }
        } catch (err) {
            console.error("Error loading portfolio:", err);
        } finally {
            setPortfolioLoading(false);
        }
    };

    const handleAddPortfolioItem = async (e) => {
        e.preventDefault();
        if (!portfolioFile) {
            alert("Please select a photo of your work to upload.");
            return;
        }
        setPortfolioActionLoading(true);
        try {
            const formData = new FormData();
            formData.append("image", portfolioFile);
            formData.append("caption", portfolioCaption);
            formData.append("is_primary", portfolioIsPrimary);

            const res = await fetch("http://localhost:5000/api/portfolio", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to add portfolio item.");
            }
            setShowAddPortfolioModal(false);
            setPortfolioFile(null);
            setPortfolioPreview("");
            setPortfolioCaption("");
            setPortfolioIsPrimary(false);
            fetchPortfolio();
        } catch (err) {
            alert(err.message || "Portfolio upload failed.");
        } finally {
            setPortfolioActionLoading(false);
        }
    };

    const handleSetPrimaryPortfolio = async (id) => {
        try {
            const res = await fetch(`http://localhost:5000/api/portfolio/${id}/primary`, {
                method: "PUT",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchPortfolio();
            }
        } catch (err) {
            console.error("Set primary error:", err);
        }
    };

    const handleDeletePortfolio = async (id) => {
        if (!window.confirm("Are you sure you want to remove this work image from your portfolio?")) return;
        try {
            const res = await fetch(`http://localhost:5000/api/portfolio/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchPortfolio();
            }
        } catch (err) {
            console.error("Delete portfolio error:", err);
        }
    };

    // Feature 5: Custom Requests Fetch & Quote Submission
    const fetchOpenRequests = async () => {
        setOpenRequestsLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/service-requests?status=OPEN", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setOpenRequests(data.requests || []);
            }
        } catch (err) {
            console.error("Error loading open requests:", err);
        } finally {
            setOpenRequestsLoading(false);
        }
    };

    const handleSubmitQuote = async (requestId) => {
        if (!quoteAmount || Number(quoteAmount) <= 0) {
            alert("Please enter a valid positive quote amount in ₹.");
            return;
        }
        setQuoteSubmitting(true);
        setQuoteSuccessMsg("");
        try {
            const res = await fetch(`http://localhost:5000/api/service-requests/${requestId}/responses`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    quote_amount: Number(quoteAmount),
                    message: quoteMessage,
                    estimated_days: Number(quoteDays) || 3
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to submit quote.");
            }
            setQuoteSuccessMsg("✓ Quote proposal submitted! The customer will be notified.");
            setActiveQuoteRequestId(null);
            setQuoteAmount("");
            setQuoteMessage("");
            fetchOpenRequests();
            setTimeout(() => setQuoteSuccessMsg(""), 4000);
        } catch (err) {
            alert(err.message || "Failed to submit quote.");
        } finally {
            setQuoteSubmitting(false);
        }
    };

    // Feature 1: Location & Service Areas Handlers
    const fetchServiceAreas = async () => {
        if (!token) return;
        setServiceAreasLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/location/service-areas", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setServiceAreas(data.service_areas || []);
            }
        } catch (err) {
            console.error("Error loading service areas:", err);
        } finally {
            setServiceAreasLoading(false);
        }
    };

    const handleAddServiceArea = async (e) => {
        e.preventDefault();
        if (!newAreaCity.trim()) {
            setAreaActionError("Please enter a city name.");
            return;
        }
        setAreaActionLoading(true);
        setAreaActionError("");
        setAreaActionSuccess("");
        try {
            const res = await fetch("http://localhost:5000/api/location/service-areas", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    city: newAreaCity.trim(),
                    state: newAreaState.trim(),
                    pincode: newAreaPincode.trim(),
                    area: newAreaLocality.trim()
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to add service area.");
            }
            setAreaActionSuccess(`✓ Added "${newAreaCity.trim()}" to your active service coverage!`);
            setNewAreaCity("");
            setNewAreaState("");
            setNewAreaPincode("");
            setNewAreaLocality("");
            fetchServiceAreas();
            setTimeout(() => setAreaActionSuccess(""), 4000);
        } catch (err) {
            setAreaActionError(err.message || "Error adding service area.");
        } finally {
            setAreaActionLoading(false);
        }
    };

    const handleRemoveServiceArea = async (areaId) => {
        if (!window.confirm("Remove this service area from your active coverage?")) return;
        try {
            const res = await fetch(`http://localhost:5000/api/location/service-areas/${areaId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                fetchServiceAreas();
            } else {
                alert(data.message || "Failed to remove service area.");
            }
        } catch (err) {
            console.error("Error removing service area:", err);
        }
    };

    const handleLogout = () => {
        logoutUser();
        navigate("/login");
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setProfileError("");
        setProfileSuccess("");
        setProfileLoading(true);

        try {
            const response = await fetch("http://localhost:5000/api/users/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user?.id,
                    name: profileName,
                    phone: profilePhone,
                    address: profileAddress,
                    city: profileCity.trim(),
                    state: profileState.trim(),
                    pincode: profilePincode.trim(),
                    country: profileCountry.trim()
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to update provider profile.");
            }

            updateUser(data.user);
            fetchServiceAreas();
            setProfileSuccess("Provider profile updated successfully!");
            setTimeout(() => {
                setShowProfileModal(false);
                setProfileSuccess("");
            }, 1200);
        } catch (err) {
            setProfileError(err.message || "An unexpected error occurred.");
        } finally {
            setProfileLoading(false);
        }
    };

    // Add New Service
    const handleAddService = async (e) => {
        e.preventDefault();
        setServiceActionError("");
        setServiceActionSuccess("");
        setServiceActionLoading(true);

        try {
            const response = await fetch("http://localhost:5000/api/services", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    service_name: newServiceName,
                    category_id: newServiceCategory,
                    price: Number(newServicePrice),
                    duration_minutes: Number(newServiceDuration),
                    location: newServiceLocation,
                    image_url: newServiceImage || "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80",
                    description: newServiceDescription
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to create service.");
            }

            setServiceActionSuccess("Service added successfully!");
            fetchMyServices();

            setTimeout(() => {
                setShowAddServiceModal(false);
                setNewServiceName("");
                setNewServicePrice("");
                setNewServiceDescription("");
                setServiceActionSuccess("");
            }, 1200);
        } catch (err) {
            setServiceActionError(err.message || "Error adding service.");
        } finally {
            setServiceActionLoading(false);
        }
    };

    // Update Service
    const handleUpdateService = async (e) => {
        e.preventDefault();
        setServiceActionError("");
        setServiceActionSuccess("");
        setServiceActionLoading(true);

        try {
            const response = await fetch(`http://localhost:5000/api/services/${editingService.service_id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    service_name: editingService.service_name,
                    category_id: editingService.category_id,
                    price: Number(editingService.price),
                    duration_minutes: Number(editingService.duration_minutes),
                    location: editingService.location,
                    availability: editingService.availability,
                    image_url: editingService.image_url,
                    description: editingService.description
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to update service.");
            }

            setServiceActionSuccess("Service updated successfully!");
            fetchMyServices();

            setTimeout(() => {
                setEditingService(null);
                setServiceActionSuccess("");
            }, 1200);
        } catch (err) {
            setServiceActionError(err.message || "Error updating service.");
        } finally {
            setServiceActionLoading(false);
        }
    };

    // Delete Service
    const handleDeleteService = async (serviceId) => {
        if (!window.confirm("Are you sure you want to permanently delete this service?")) return;

        try {
            const response = await fetch(`http://localhost:5000/api/services/${serviceId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json();
            if (data.success) {
                fetchMyServices();
            } else {
                alert(data.message || "Failed to delete service.");
            }
        } catch (err) {
            console.error("Delete service error:", err);
            alert("Error deleting service.");
        }
    };

    // Update Booking Status (Accept, Complete, Cancel)
    const handleUpdateBookingStatus = async (bookingId, newStatus) => {
        try {
            const response = await fetch(`http://localhost:5000/api/bookings/${bookingId}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();
            if (data.success) {
                fetchProviderBookings();
            } else {
                alert(data.message || "Failed to update booking status.");
            }
        } catch (err) {
            console.error("Booking status update error:", err);
            alert("Error updating booking status.");
        }
    };

    // Filter provider bookings
    const filteredBookings = bookings.filter((b) => {
        if (bookingFilterTab === "all") return true;
        return (b.status || "").toLowerCase() === bookingFilterTab.toLowerCase();
    });

    // KPI Calculations
    const completedBookings = bookings.filter((b) => (b.status || "").toLowerCase() === "completed");
    const totalEarnings = completedBookings.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
    const activeBookingsCount = bookings.filter((b) => {
        const s = (b.status || "").toLowerCase();
        return s === "pending" || s === "accepted";
    }).length;

    return (
        <div className="provider-dashboard">

            {/* Background decorations */}
            <div className="dashboard-bubble provider-bubble-one"></div>
            <div className="dashboard-bubble provider-bubble-two"></div>
            <div className="dashboard-ring provider-ring-one"></div>

            {/* NAVBAR */}
            <header className="provider-navbar">
                <Link to="/provider-dashboard" className="dashboard-logo">
                    <div className="mini-leaf-logo">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <span>SkillNest Provider Portal</span>
                </Link>

                <div className="provider-navbar-right" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <ModeSwitcher />
                    <NotificationBell />

                    {/* Feature 2: Provider KYC Verification Trigger - Only show if not verified */}
                    {!user?.is_verified && (
                        <button
                            onClick={() => setShowVerificationModal(true)}
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 14px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "700",
                                cursor: "pointer",
                                border: "1px solid #fde047",
                                background: "#fefce8",
                                color: "#a16207",
                                transition: "all 0.2s ease"
                            }}
                            title="Click to check or update KYC Identity Verification"
                        >
                            <span>🛡️</span>
                            <span>Verify Identity (KYC)</span>
                        </button>
                    )}

                    <div
                        className="profile-mini"
                        onClick={() => setShowProfileModal(true)}
                        style={{ cursor: "pointer" }}
                        title="Click to view or edit your profile"
                    >
                        <div className="profile-avatar">
                            {user?.name ? user.name.charAt(0).toUpperCase() : "P"}
                        </div>
                        <div className="profile-info">
                            <strong>{user?.name || "Provider"}</strong>
                            <span>{user?.isProfileBuilt ? "Verified Pro" : "Build Profile"}</span>
                        </div>
                        <span className="profile-arrow">▾</span>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="logout-button"
                        style={{
                            marginLeft: "12px",
                            padding: "8px 16px",
                            background: "#fff2d6",
                            border: "1px solid #ebd08d",
                            borderRadius: "10px",
                            color: "#835b0a",
                            fontWeight: "600",
                            fontSize: "13px",
                            cursor: "pointer"
                        }}
                    >
                        Sign out
                    </button>
                </div>
            </header>

            {/* MAIN LAYOUT */}
            <div className="provider-layout">

                {/* SIDEBAR */}
                <aside className="provider-sidebar">
                    <div className="provider-sidebar-menu">
                        <div className="sidebar-label">PROVIDER MENU</div>

                        <button
                            onClick={() => setActiveTab("dashboard")}
                            className={`sidebar-item ${activeTab === "dashboard" ? "active" : ""}`}
                            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                        >
                            <span>🏠</span>
                            Dashboard Overview
                        </button>

                        <button
                            onClick={() => setActiveTab("services")}
                            className={`sidebar-item ${activeTab === "services" ? "active" : ""}`}
                            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                        >
                            <span>🛠</span>
                            My Services
                            <span className="sidebar-count">{myServices.length}</span>
                        </button>

                        <button
                            onClick={() => setActiveTab("bookings")}
                            className={`sidebar-item ${activeTab === "bookings" ? "active" : ""}`}
                            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                        >
                            <span>📅</span>
                            Customer Bookings
                            {activeBookingsCount > 0 && (
                                <span className="sidebar-count" style={{ background: "#c98e1b", color: "#fff" }}>
                                    {activeBookingsCount}
                                </span>
                            )}
                        </button>

                        {/* Feature 4: Portfolio Tab */}
                        <button
                            onClick={() => setActiveTab("portfolio")}
                            className={`sidebar-item ${activeTab === "portfolio" ? "active" : ""}`}
                            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                        >
                            <span>🎨</span>
                            Work Portfolio
                            <span className="sidebar-count">{portfolio.length}</span>
                        </button>

                        {/* Feature 5: Custom Service Requests Tab */}
                        <button
                            onClick={() => setActiveTab("custom-requests")}
                            className={`sidebar-item ${activeTab === "custom-requests" ? "active" : ""}`}
                            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                        >
                            <span>📢</span>
                            Custom Requests
                            {openRequests.length > 0 && (
                                <span className="sidebar-count" style={{ background: "#c98e1b", color: "#fff" }}>
                                    {openRequests.length}
                                </span>
                            )}
                        </button>

                        {/* Feature 1: Service Coverage Areas Tab */}
                        <button
                            onClick={() => setActiveTab("service-areas")}
                            className={`sidebar-item ${activeTab === "service-areas" ? "active" : ""}`}
                            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                        >
                            <span>📍</span>
                            Service Areas
                            <span className="sidebar-count" style={{ background: "#c98e1b", color: "#fff" }}>
                                {serviceAreas.length + (user?.city ? 1 : 0)}
                            </span>
                        </button>

                        {/* Feature 2: Identity KYC Sidebar Item */}
                        <button
                            onClick={() => setShowVerificationModal(true)}
                            className="sidebar-item"
                            style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                        >
                            <span>🛡️</span>
                            Identity KYC
                            <span className="sidebar-count" style={{
                                background: user?.is_verified ? "#22c55e" : "#f59e0b",
                                color: "#fff"
                            }}>
                                {user?.is_verified ? "✓ Verified" : "Pending"}
                            </span>
                        </button>
                    </div>

                    <div className="sidebar-bottom-section">
                        <div className="sidebar-divider"></div>
                        <div className="sidebar-promo">
                            <span>💡 Pro Tip</span>
                            <p>Keep your service prices competitive and respond to booking requests quickly to earn top provider badges.</p>
                        </div>
                    </div>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="provider-main">

                    {/* Feature 2: Provider Identity Verification Request Banner - ONLY show when verification is pending */}
                    {!user?.is_verified && (
                        <div style={{
                            background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
                            border: "1px solid #fde68a",
                            borderRadius: "16px",
                            padding: "16px 20px",
                            marginBottom: "24px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: "16px"
                        }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                <span style={{ fontSize: "32px" }}>⚠️</span>
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <strong style={{ color: "#92400e", fontSize: "15px" }}>
                                            Identity Verification Pending
                                        </strong>
                                        <span style={{
                                            background: "#f59e0b",
                                            color: "#ffffff",
                                            fontSize: "11px",
                                            fontWeight: "800",
                                            padding: "2px 8px",
                                            borderRadius: "10px"
                                        }}>
                                            ACTION RECOMMENDED
                                        </span>
                                    </div>
                                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#b45309" }}>
                                        Complete your quick KYC identity check to display the verified badge and attract more bookings.
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowVerificationModal(true)}
                                style={{
                                    background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                                    color: "#ffffff",
                                    border: "none",
                                    padding: "9px 18px",
                                    borderRadius: "10px",
                                    fontWeight: "700",
                                    fontSize: "13px",
                                    cursor: "pointer",
                                    boxShadow: "0 2px 8px rgba(201,142,27,0.3)"
                                }}
                            >
                                🛡️ Verify Identity Now
                            </button>
                        </div>
                    )}

                    {/* TOP STATS ROW */}
                    <section className="provider-stats-grid">
                        <div className="provider-stat-card">
                            <div className="stat-icon-wrap earnings-icon">💰</div>
                            <div>
                                <span className="stat-card-label">Total Realized Revenue</span>
                                <h3 className="stat-card-value">₹{totalEarnings.toLocaleString()}</h3>
                                <span className="stat-card-change positive">From completed bookings</span>
                            </div>
                        </div>

                        <div className="provider-stat-card">
                            <div className="stat-icon-wrap bookings-icon">📅</div>
                            <div>
                                <span className="stat-card-label">Active Bookings</span>
                                <h3 className="stat-card-value">{activeBookingsCount}</h3>
                                <span className="stat-card-change">Pending & Accepted</span>
                            </div>
                        </div>

                        <div className="provider-stat-card">
                            <div className="stat-icon-wrap clients-icon">🛠</div>
                            <div>
                                <span className="stat-card-label">Offered Services</span>
                                <h3 className="stat-card-value">{myServices.length}</h3>
                                <span className="stat-card-change positive">Active in catalog</span>
                            </div>
                        </div>

                        <div className="provider-stat-card">
                            <div className="stat-icon-wrap rating-icon">⭐</div>
                            <div>
                                <span className="stat-card-label">Completed Jobs</span>
                                <h3 className="stat-card-value">{completedBookings.length}</h3>
                                <span className="stat-card-change positive">100% Satisfaction</span>
                            </div>
                        </div>
                    </section>

                    {/* ================================
                        MEMBER 2: MY SERVICES SECTION
                    ================================ */}
                    {(activeTab === "dashboard" || activeTab === "services") && (
                        <section className="provider-section" style={{ marginTop: "24px" }}>
                            <div className="provider-section-header">
                                <div>
                                    <span className="section-label">MY SERVICES CATALOG</span>
                                    <h2>My Listed Services</h2>
                                </div>
                                <button
                                    className="add-service-button"
                                    onClick={() => setShowAddServiceModal(true)}
                                    style={{ cursor: "pointer" }}
                                >
                                    + Add New Service
                                </button>
                            </div>

                            {servicesLoading ? (
                                <div style={{ textAlign: "center", padding: "30px 0", color: "#8a7536" }}>
                                    Loading your services...
                                </div>
                            ) : myServices.length === 0 ? (
                                <div style={{
                                    textAlign: "center",
                                    padding: "40px 20px",
                                    background: "#ffffff",
                                    borderRadius: "16px",
                                    border: "1px dashed #ebd08d"
                                }}>
                                    <span style={{ fontSize: "36px" }}>🛠</span>
                                    <h3 style={{ marginTop: "12px", color: "#382d12" }}>You haven't listed any services yet</h3>
                                    <p style={{ color: "#7a6b47", fontSize: "14px" }}>
                                        Offer your expertise to local customers by adding your first service!
                                    </p>
                                    <button
                                        className="add-service-button"
                                        onClick={() => setShowAddServiceModal(true)}
                                        style={{ marginTop: "16px", cursor: "pointer" }}
                                    >
                                        + Create Service Now
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    {myServices.map((srv) => (
                                        <div className="provider-service-card" key={srv.service_id}>
                                            <div className="provider-service-icon">
                                                {getCategoryIcon(srv.service_categories?.category_name)}
                                            </div>

                                            <div className="provider-service-info">
                                                <span style={{ color: "#c98e1b", fontWeight: "800" }}>
                                                    {srv.service_categories?.category_name || "GENERAL SERVICE"}
                                                </span>
                                                <h3>{srv.service_name}</h3>
                                                <p>{srv.description}</p>

                                                <div className="provider-service-meta">
                                                    <span>📍 {srv.location || "Bengaluru"}</span>
                                                    <span>⏱ {srv.duration_minutes || 60} mins</span>
                                                    <span style={{
                                                        padding: "2px 8px",
                                                        borderRadius: "12px",
                                                        fontSize: "11px",
                                                        fontWeight: "700",
                                                        background: srv.availability ? "#e1faea" : "#ffe6e6",
                                                        color: srv.availability ? "#107c39" : "#c41c1c"
                                                    }}>
                                                        {srv.availability ? "Active" : "Paused"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="provider-service-price">
                                                <strong>₹{srv.price}</strong>
                                                <span>per booking</span>
                                            </div>

                                            <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                                                <button
                                                    className="manage-button"
                                                    onClick={() => setEditingService(srv)}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    Edit ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteService(srv.service_id)}
                                                    style={{
                                                        padding: "8px 16px",
                                                        background: "#ffebeb",
                                                        border: "1px solid #ffcccc",
                                                        borderRadius: "10px",
                                                        color: "#c41c1c",
                                                        fontWeight: "700",
                                                        fontSize: "13px",
                                                        cursor: "pointer"
                                                    }}
                                                >
                                                    Delete 🗑
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ================================
                        MEMBER 3: PROVIDER BOOKINGS SECTION
                    ================================ */}
                    {(activeTab === "dashboard" || activeTab === "bookings") && (
                        <section className="provider-section" style={{ marginTop: "32px" }}>
                            <div className="provider-section-header">
                                <div>
                                    <span className="section-label">CUSTOMER BOOKINGS & ORDERS</span>
                                    <h2>Customer Booking Requests</h2>
                                </div>
                                <button
                                    className="view-all-button"
                                    onClick={fetchProviderBookings}
                                    style={{ cursor: "pointer" }}
                                >
                                    ↻ Refresh
                                </button>
                            </div>

                            {/* Booking Status Tabs */}
                            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                                {["all", "pending", "accepted", "completed", "cancelled"].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setBookingFilterTab(tab)}
                                        style={{
                                            padding: "8px 16px",
                                            borderRadius: "20px",
                                            border: bookingFilterTab === tab ? "2px solid #c98e1b" : "1px solid #ebd08d",
                                            background: bookingFilterTab === tab ? "#c98e1b" : "#ffffff",
                                            color: bookingFilterTab === tab ? "#ffffff" : "#68501e",
                                            fontWeight: "700",
                                            fontSize: "13px",
                                            cursor: "pointer",
                                            textTransform: "capitalize"
                                        }}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {bookingsLoading ? (
                                <div style={{ textAlign: "center", padding: "30px 0", color: "#8a7536" }}>
                                    Loading customer bookings...
                                </div>
                            ) : filteredBookings.length === 0 ? (
                                <div style={{
                                    textAlign: "center",
                                    padding: "40px 20px",
                                    background: "#ffffff",
                                    borderRadius: "16px",
                                    border: "1px dashed #ebd08d"
                                }}>
                                    <span style={{ fontSize: "32px" }}>📅</span>
                                    <h3 style={{ marginTop: "10px", color: "#382d12" }}>No {bookingFilterTab} bookings</h3>
                                    <p style={{ color: "#7a6b47", fontSize: "14px" }}>
                                        New customer orders for your services will appear here automatically.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    {filteredBookings.map((bk) => {
                                        const status = (bk.status || "pending").toLowerCase();
                                        const isPending = status === "pending";
                                        const isAccepted = status === "accepted";
                                        const isCompleted = status === "completed";
                                        const isCancelled = status === "cancelled";

                                        return (
                                            <div
                                                key={bk.booking_id}
                                                style={{
                                                    background: "#ffffff",
                                                    borderRadius: "16px",
                                                    padding: "20px",
                                                    border: "1px solid #f1e0a8",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    flexWrap: "wrap",
                                                    gap: "16px",
                                                    boxShadow: "0 4px 15px rgba(201, 142, 27, 0.05)"
                                                }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                                    <div style={{
                                                        width: "52px",
                                                        height: "52px",
                                                        borderRadius: "14px",
                                                        background: "#fff6de",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontSize: "24px"
                                                    }}>
                                                        {getCategoryIcon(bk.services?.service_categories?.category_name)}
                                                    </div>

                                                    <div>
                                                        <span style={{
                                                            fontSize: "11px",
                                                            fontWeight: "800",
                                                            color: "#c98e1b",
                                                            textTransform: "uppercase"
                                                        }}>
                                                            {bk.services?.service_name || "Service Order"}
                                                        </span>
                                                        <h3 style={{ margin: "2px 0 4px 0", fontSize: "17px", color: "#24202b" }}>
                                                            Customer: {bk.customer?.full_name || "Client"}
                                                        </h3>
                                                        <p style={{ margin: 0, fontSize: "13px", color: "#7a6b47" }}>
                                                            📅 Scheduled: <strong>{bk.booking_date}</strong> at <strong>{bk.booking_time}</strong>
                                                        </p>
                                                        <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#8a7536" }}>
                                                            📍 Address: {bk.address}
                                                        </p>
                                                        {bk.customer?.phone && (
                                                            <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#68501e" }}>
                                                                📞 Phone: {bk.customer.phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                                    <div style={{ textAlign: "right" }}>
                                                        <strong style={{ fontSize: "18px", color: "#382d12" }}>
                                                            ₹{bk.total_amount}
                                                        </strong>
                                                        <div style={{ marginTop: "4px", display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                                                            <span style={{
                                                                padding: "4px 10px",
                                                                borderRadius: "20px",
                                                                fontSize: "11px",
                                                                fontWeight: "800",
                                                                textTransform: "uppercase",
                                                                background:
                                                                    isPending ? "#fff4cc" :
                                                                    isAccepted ? "#dcf4ff" :
                                                                    isCompleted ? "#e1faea" : "#ffe6e6",
                                                                color:
                                                                    isPending ? "#916a00" :
                                                                    isAccepted ? "#006c99" :
                                                                    isCompleted ? "#107c39" : "#c41c1c"
                                                            }}>
                                                                {status}
                                                            </span>

                                                            {/* Member 4: Payment Status Indicator */}
                                                            {(() => {
                                                                const p = paymentsMap[bk.booking_id];
                                                                const isPaid = p && p.payment_status === "success";
                                                                return (
                                                                    <span style={{
                                                                        padding: "4px 10px",
                                                                        borderRadius: "20px",
                                                                        fontSize: "11px",
                                                                        fontWeight: "800",
                                                                        textTransform: "uppercase",
                                                                        background: isPaid ? "#e1faea" : "#fff8e6",
                                                                        color: isPaid ? "#107c39" : "#835b0a",
                                                                        border: isPaid ? "1px solid #b7ebd0" : "1px solid #ebd08d"
                                                                    }}>
                                                                        {isPaid ? "✓ Paid" : "Unpaid"}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                                                        {isPending && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUpdateBookingStatus(bk.booking_id, "accepted")}
                                                                    style={{
                                                                        padding: "8px 14px",
                                                                        background: "#107c39",
                                                                        color: "#ffffff",
                                                                        border: "none",
                                                                        borderRadius: "8px",
                                                                        fontWeight: "700",
                                                                        fontSize: "13px",
                                                                        cursor: "pointer"
                                                                    }}
                                                                >
                                                                    ✓ Accept
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateBookingStatus(bk.booking_id, "cancelled")}
                                                                    style={{
                                                                        padding: "8px 14px",
                                                                        background: "#ffebeb",
                                                                        color: "#c41c1c",
                                                                        border: "1px solid #ffcccc",
                                                                        borderRadius: "8px",
                                                                        fontWeight: "700",
                                                                        fontSize: "13px",
                                                                        cursor: "pointer"
                                                                    }}
                                                                >
                                                                    ✕ Reject
                                                                </button>
                                                            </>
                                                        )}

                                                        {isAccepted && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUpdateBookingStatus(bk.booking_id, "completed")}
                                                                    style={{
                                                                        padding: "8px 14px",
                                                                        background: "#c98e1b",
                                                                        color: "#ffffff",
                                                                        border: "none",
                                                                        borderRadius: "8px",
                                                                        fontWeight: "700",
                                                                        fontSize: "13px",
                                                                        cursor: "pointer"
                                                                    }}
                                                                >
                                                                    Mark Complete ★
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateBookingStatus(bk.booking_id, "cancelled")}
                                                                    style={{
                                                                        padding: "8px 14px",
                                                                        background: "#ffebeb",
                                                                        color: "#c41c1c",
                                                                        border: "1px solid #ffcccc",
                                                                        borderRadius: "8px",
                                                                        fontWeight: "700",
                                                                        fontSize: "13px",
                                                                        cursor: "pointer"
                                                                    }}
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </>
                                                        )}

                                                        <button
                                                            onClick={() => setSelectedBookingDetails(bk)}
                                                            style={{
                                                                padding: "8px 14px",
                                                                background: "#fff6de",
                                                                border: "1px solid #ebd08d",
                                                                borderRadius: "8px",
                                                                fontWeight: "600",
                                                                fontSize: "13px",
                                                                color: "#835b0a",
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            Details
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ================================
                        FEATURE 4: PROVIDER PORTFOLIO SECTION
                    ================================ */}
                    {(activeTab === "portfolio" || activeTab === "dashboard") && (
                        <section className="provider-section" style={{ marginTop: "32px" }}>
                            <div className="provider-section-header">
                                <div>
                                    <span className="section-label">VERIFIED WORK & PORTFOLIO</span>
                                    <h2>Craftsmanship Showcase</h2>
                                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#8a7536" }}>
                                        Upload real photos of your past work (blouse stitching, bridal makeup, meals, carpentry). Clients view your portfolio before booking.
                                    </p>
                                </div>
                                <button
                                    className="add-service-button"
                                    onClick={() => setShowAddPortfolioModal(true)}
                                    style={{ cursor: "pointer" }}
                                >
                                    + Upload Showcase Work
                                </button>
                            </div>

                            {portfolioLoading ? (
                                <div style={{ textAlign: "center", padding: "30px 0", color: "#8a7536" }}>
                                    Loading your portfolio showcase...
                                </div>
                            ) : portfolio.length === 0 ? (
                                <div style={{
                                    textAlign: "center",
                                    padding: "40px 20px",
                                    background: "#ffffff",
                                    borderRadius: "16px",
                                    border: "1px dashed #ebd08d"
                                }}>
                                    <span style={{ fontSize: "36px" }}>📷</span>
                                    <h3 style={{ marginTop: "12px", color: "#382d12" }}>No portfolio items uploaded yet</h3>
                                    <p style={{ color: "#7a6b47", fontSize: "14px" }}>
                                        Showcase your real work to build credibility and win high-paying customers!
                                    </p>
                                    <button
                                        className="add-service-button"
                                        onClick={() => setShowAddPortfolioModal(true)}
                                        style={{ marginTop: "16px", cursor: "pointer" }}
                                    >
                                        + Add Your First Work Photo
                                    </button>
                                </div>
                            ) : (
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                                    gap: "20px"
                                }}>
                                    {portfolio.map((item) => (
                                        <div
                                            key={item.id}
                                            style={{
                                                background: "#ffffff",
                                                borderRadius: "16px",
                                                overflow: "hidden",
                                                border: item.is_primary ? "2px solid #c98e1b" : "1px solid #ebd08d",
                                                boxShadow: "0 4px 15px rgba(201, 142, 27, 0.08)",
                                                display: "flex",
                                                flexDirection: "column"
                                            }}
                                        >
                                            <div style={{ height: "180px", position: "relative", backgroundColor: "#fbf9f4" }}>
                                                <img
                                                    src={item.image_url}
                                                    alt={item.caption || "Portfolio item"}
                                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                                />
                                                {item.is_primary && (
                                                    <span style={{
                                                        position: "absolute",
                                                        top: "10px",
                                                        left: "10px",
                                                        background: "#c98e1b",
                                                        color: "#ffffff",
                                                        fontSize: "10px",
                                                        fontWeight: "800",
                                                        padding: "4px 8px",
                                                        borderRadius: "12px"
                                                    }}>
                                                        ⭐ PRIMARY COVER
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ padding: "14px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: "13px", color: "#382d12", fontWeight: "600" }}>
                                                        {item.caption || "Craftsmanship Sample"}
                                                    </p>
                                                </div>
                                                <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                                                    {!item.is_primary && (
                                                        <button
                                                            onClick={() => handleSetPrimaryPortfolio(item.id)}
                                                            style={{
                                                                flex: 1,
                                                                padding: "6px",
                                                                borderRadius: "8px",
                                                                border: "1px solid #ebd08d",
                                                                background: "#fff9eb",
                                                                color: "#835b0a",
                                                                fontSize: "12px",
                                                                fontWeight: "700",
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            Set Cover
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeletePortfolio(item.id)}
                                                        style={{
                                                            flex: 1,
                                                            padding: "6px",
                                                            borderRadius: "8px",
                                                            border: "1px solid #fecaca",
                                                            background: "#fef2f2",
                                                            color: "#b91c1c",
                                                            fontSize: "12px",
                                                            fontWeight: "700",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ================================
                        FEATURE 5: CUSTOM SERVICE REQUESTS (MARKETPLACE)
                    ================================ */}
                    {(activeTab === "custom-requests" || activeTab === "dashboard") && (
                        <section className="provider-section" style={{ marginTop: "32px" }}>
                            <div className="provider-section-header">
                                <div>
                                    <span className="section-label">CUSTOM CLIENT REQUESTS</span>
                                    <h2>Open Customer Requests (Bidding Marketplace)</h2>
                                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#8a7536" }}>
                                        Clients submit unique bespoke requirements with target budgets and deadlines. Review requirements and submit your price quote to win the job.
                                    </p>
                                </div>
                                <button
                                    className="view-all-button"
                                    onClick={fetchOpenRequests}
                                    style={{ cursor: "pointer" }}
                                >
                                    ↻ Refresh Requests
                                </button>
                            </div>

                            {quoteSuccessMsg && (
                                <div style={{
                                    padding: "12px 18px",
                                    background: "#e1faea",
                                    border: "1px solid #a3e9be",
                                    color: "#107c39",
                                    borderRadius: "12px",
                                    fontWeight: "700",
                                    fontSize: "14px",
                                    marginBottom: "20px"
                                }}>
                                    {quoteSuccessMsg}
                                </div>
                            )}

                            {openRequestsLoading ? (
                                <div style={{ textAlign: "center", padding: "30px 0", color: "#8a7536" }}>
                                    Loading open customer requests...
                                </div>
                            ) : openRequests.length === 0 ? (
                                <div style={{
                                    textAlign: "center",
                                    padding: "40px 20px",
                                    background: "#ffffff",
                                    borderRadius: "16px",
                                    border: "1px dashed #ebd08d"
                                }}>
                                    <span style={{ fontSize: "36px" }}>📢</span>
                                    <h3 style={{ marginTop: "12px", color: "#382d12" }}>No open custom requests right now</h3>
                                    <p style={{ color: "#7a6b47", fontSize: "14px" }}>
                                        When customers post tailored requirements in your area, they will appear here for bidding.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                    {openRequests.map((req) => (
                                        <div
                                            key={req.id}
                                            style={{
                                                background: "#ffffff",
                                                borderRadius: "16px",
                                                padding: "22px",
                                                border: "1px solid #f1e0a8",
                                                boxShadow: "0 4px 15px rgba(201, 142, 27, 0.06)"
                                            }}
                                        >
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
                                                <div>
                                                    <span style={{
                                                        fontSize: "11px",
                                                        fontWeight: "800",
                                                        color: "#c98e1b",
                                                        textTransform: "uppercase"
                                                    }}>
                                                        {req.category}
                                                    </span>
                                                    <h3 style={{ margin: "4px 0", fontSize: "18px", color: "#24202b" }}>
                                                        {req.title}
                                                    </h3>
                                                    <p style={{ margin: "4px 0", fontSize: "13px", color: "#7a6b47" }}>
                                                        Client: <strong>{req.customer_name}</strong> · 📍 Location: {req.location}
                                                    </p>
                                                </div>

                                                <div style={{ textAlign: "right" }}>
                                                    <span style={{ fontSize: "12px", color: "#8a7536" }}>Client Target Budget</span>
                                                    <div style={{ fontSize: "20px", fontWeight: "800", color: "#382d12" }}>
                                                        ₹{req.budget}
                                                    </div>
                                                    {req.deadline && (
                                                        <span style={{ fontSize: "11px", color: "#c41c1c", fontWeight: "700" }}>
                                                            ⏱ Needed by: {req.deadline}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{
                                                margin: "14px 0",
                                                padding: "12px 16px",
                                                background: "#faf8f5",
                                                borderRadius: "10px",
                                                fontSize: "13px",
                                                color: "#382d12",
                                                lineHeight: "1.5"
                                            }}>
                                                {req.description}
                                            </div>

                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                                                <span style={{ fontSize: "12px", color: "#8a7536" }}>
                                                    💬 {req.responses_count || 0} provider quote(s) received
                                                </span>

                                                {req.has_responded ? (
                                                    <span style={{
                                                        padding: "6px 14px",
                                                        borderRadius: "20px",
                                                        background: "#e1faea",
                                                        color: "#107c39",
                                                        fontSize: "12px",
                                                        fontWeight: "700"
                                                    }}>
                                                        ✓ You Submitted a Quote
                                                    </span>
                                                ) : activeQuoteRequestId === req.id ? (
                                                    <button
                                                        onClick={() => setActiveQuoteRequestId(null)}
                                                        style={{
                                                            padding: "6px 14px",
                                                            borderRadius: "8px",
                                                            border: "1px solid #ebd08d",
                                                            background: "#ffffff",
                                                            color: "#835b0a",
                                                            fontWeight: "700",
                                                            fontSize: "12px",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => {
                                                            setActiveQuoteRequestId(req.id);
                                                            setQuoteAmount(String(req.budget || 500));
                                                        }}
                                                        style={{
                                                            padding: "8px 18px",
                                                            borderRadius: "10px",
                                                            border: "none",
                                                            background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                                                            color: "#ffffff",
                                                            fontWeight: "700",
                                                            fontSize: "13px",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        Submit Price Quote →
                                                    </button>
                                                )}
                                            </div>

                                            {/* Inline Quote Submission Drawer */}
                                            {activeQuoteRequestId === req.id && (
                                                <div style={{
                                                    marginTop: "16px",
                                                    padding: "16px",
                                                    background: "#fffdf9",
                                                    borderRadius: "12px",
                                                    border: "1px solid #ebd08d"
                                                }}>
                                                    <h4 style={{ margin: "0 0 12px 0", color: "#382d12" }}>
                                                        Send Proposal & Price Quote
                                                    </h4>
                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                                                        <div>
                                                            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                                                Your Quoted Price (₹) *
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={quoteAmount}
                                                                onChange={(e) => setQuoteAmount(e.target.value)}
                                                                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                                                Estimated Days to Complete
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={quoteDays}
                                                                onChange={(e) => setQuoteDays(e.target.value)}
                                                                style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div style={{ marginBottom: "12px" }}>
                                                        <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                                            Message / Scope Details to Client
                                                        </label>
                                                        <textarea
                                                            rows="2"
                                                            placeholder="e.g. I have 8 years experience in bridal tailoring. I can complete this with custom gold piping in 3 days..."
                                                            value={quoteMessage}
                                                            onChange={(e) => setQuoteMessage(e.target.value)}
                                                            style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px" }}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={() => handleSubmitQuote(req.id)}
                                                        disabled={quoteSubmitting}
                                                        style={{
                                                            padding: "9px 20px",
                                                            borderRadius: "8px",
                                                            border: "none",
                                                            background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                                                            color: "#ffffff",
                                                            fontWeight: "700",
                                                            fontSize: "13px",
                                                            cursor: quoteSubmitting ? "not-allowed" : "pointer"
                                                        }}
                                                    >
                                                        {quoteSubmitting ? "Submitting..." : "Send Proposal to Client"}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* ================================
                        FEATURE 1: SERVICE COVERAGE AREAS
                    ================================ */}
                    {activeTab === "service-areas" && (
                        <section className="provider-section" style={{ marginTop: "24px" }}>
                            <div className="provider-section-header">
                                <div>
                                    <span className="section-label">SERVICE COVERAGE TERRITORIES</span>
                                    <h2>Manage Service Coverage Areas</h2>
                                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#64748b" }}>
                                        Define the exact cities and regions where you travel and offer services. Customers outside your coverage areas will not be able to book you.
                                    </p>
                                </div>
                            </div>

                            {/* BASE OPERATING CITY CARD */}
                            <div style={{
                                background: "#fffdf8",
                                border: "1px solid #ebd08d",
                                borderRadius: "16px",
                                padding: "20px",
                                marginBottom: "20px"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                        <div style={{
                                            width: "44px",
                                            height: "44px",
                                            borderRadius: "12px",
                                            background: "#fff6de",
                                            border: "1px solid #ebd08d",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "20px"
                                        }}>
                                            🏠
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "11px", fontWeight: "800", color: "#8a7536", textTransform: "uppercase" }}>
                                                Primary Operating Base (Home City)
                                            </div>
                                            <div style={{ fontSize: "16px", fontWeight: "800", color: "#1e293b" }}>
                                                {user?.city ? `${user.city}${user?.state ? `, ${user.state}` : ''}${user?.pincode ? ` - ${user.pincode}` : ''}` : "Base City Not Configured Yet"}
                                            </div>
                                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                                {user?.city
                                                    ? "✓ Automatically active. You are always discoverable by customers in your base city."
                                                    : "⚠️ Please set your city in your profile to enable discovery in your home town."}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowProfileModal(true)}
                                        style={{
                                            padding: "8px 16px",
                                            background: "#ffffff",
                                            border: "1px solid #ebd08d",
                                            borderRadius: "8px",
                                            color: "#835b0a",
                                            fontSize: "12px",
                                            fontWeight: "700",
                                            cursor: "pointer"
                                        }}
                                    >
                                        Edit Base Location
                                    </button>
                                </div>
                            </div>

                            {/* ADD NEW SERVICE AREA FORM */}
                            <div style={{
                                background: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "16px",
                                padding: "20px",
                                marginBottom: "24px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
                            }}>
                                <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b", marginBottom: "4px" }}>
                                    + Add Additional Service City or Territory
                                </div>
                                <p style={{ fontSize: "12px", color: "#64748b", margin: "0 0 14px 0" }}>
                                    Live in Kottayam but also serve Changanassery or Kumarakom? Add them below so local clients find you!
                                </p>

                                {areaActionError && (
                                    <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "13px", marginBottom: "12px" }}>
                                        {areaActionError}
                                    </div>
                                )}
                                {areaActionSuccess && (
                                    <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#15803d", fontSize: "13px", marginBottom: "12px", fontWeight: "700" }}>
                                        {areaActionSuccess}
                                    </div>
                                )}

                                <form onSubmit={handleAddServiceArea}>
                                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1.5fr auto", gap: "10px", alignItems: "flex-end" }}>
                                        <div>
                                            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                                                City / Town *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Changanassery"
                                                value={newAreaCity}
                                                onChange={(e) => setNewAreaCity(e.target.value)}
                                                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                                                State
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Kerala"
                                                value={newAreaState}
                                                onChange={(e) => setNewAreaState(e.target.value)}
                                                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                                                PIN Code
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. 686101"
                                                value={newAreaPincode}
                                                onChange={(e) => setNewAreaPincode(e.target.value)}
                                                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#475569", marginBottom: "4px" }}>
                                                Sub-Area / Locality
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. North Zone / Bypass"
                                                value={newAreaLocality}
                                                onChange={(e) => setNewAreaLocality(e.target.value)}
                                                style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "13px" }}
                                            />
                                        </div>
                                        <div>
                                            <button
                                                type="submit"
                                                disabled={areaActionLoading}
                                                style={{
                                                    padding: "10px 20px",
                                                    borderRadius: "8px",
                                                    border: "none",
                                                    background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                                                    color: "#ffffff",
                                                    fontWeight: "700",
                                                    fontSize: "13px",
                                                    cursor: areaActionLoading ? "not-allowed" : "pointer"
                                                }}
                                            >
                                                {areaActionLoading ? "Adding..." : "+ Add Area"}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>

                            {/* ACTIVE COVERAGE LIST */}
                            <div>
                                <div style={{ fontSize: "14px", fontWeight: "800", color: "#1e293b", marginBottom: "12px" }}>
                                    Active Extended Service Coverage ({serviceAreas.length})
                                </div>

                                {serviceAreasLoading ? (
                                    <div style={{ textAlign: "center", padding: "24px", color: "#8a7536" }}>
                                        Loading your service areas...
                                    </div>
                                ) : serviceAreas.length === 0 ? (
                                    <div style={{
                                        textAlign: "center",
                                        padding: "36px 20px",
                                        background: "#f8fafc",
                                        borderRadius: "14px",
                                        border: "1px dashed #cbd5e1",
                                        color: "#64748b"
                                    }}>
                                        <span style={{ fontSize: "28px" }}>📍</span>
                                        <p style={{ margin: "8px 0 0", fontSize: "14px", fontWeight: "600" }}>
                                            No additional service areas configured.
                                        </p>
                                        <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
                                            You currently only receive bookings from your home city ({user?.city || "not set"}). Add neighbouring cities above to expand your business!
                                        </p>
                                    </div>
                                ) : (
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "14px" }}>
                                        {serviceAreas.map((area) => (
                                            <div
                                                key={area.id}
                                                style={{
                                                    background: "#ffffff",
                                                    border: "1px solid #ebd08d",
                                                    borderRadius: "12px",
                                                    padding: "16px",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "flex-start",
                                                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                                                }}
                                            >
                                                <div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                                        <span style={{ fontSize: "16px" }}>📍</span>
                                                        <strong style={{ fontSize: "15px", color: "#1e293b" }}>{area.city}</strong>
                                                    </div>
                                                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                                                        {area.state && <span>{area.state} </span>}
                                                        {area.pincode && <span>· PIN: {area.pincode}</span>}
                                                    </div>
                                                    {area.area && (
                                                        <div style={{ fontSize: "11px", color: "#8a7536", marginTop: "2px", fontWeight: "600" }}>
                                                            Territory: {area.area}
                                                        </div>
                                                    )}
                                                    <div style={{ fontSize: "10px", color: "#16a34a", fontWeight: "700", marginTop: "6px" }}>
                                                        ● Active for Discovery & Bookings
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveServiceArea(area.id)}
                                                    style={{
                                                        background: "#fff1f2",
                                                        border: "1px solid #fecdd3",
                                                        color: "#e11d48",
                                                        padding: "4px 10px",
                                                        borderRadius: "6px",
                                                        fontSize: "11px",
                                                        fontWeight: "700",
                                                        cursor: "pointer"
                                                    }}
                                                    title="Remove service area"
                                                >
                                                    ✕ Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </main>
            </div>

            {/* ================================
                ADD SERVICE MODAL (MEMBER 2)
            ================================ */}
            {showAddServiceModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(35, 27, 8, 0.45)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "20px"
                }}>
                    <div style={{
                        background: "#ffffff",
                        borderRadius: "20px",
                        padding: "28px",
                        maxWidth: "520px",
                        width: "100%",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
                        border: "1px solid #f1e0a8",
                        position: "relative"
                    }}>
                        <button
                            type="button"
                            onClick={() => setShowAddServiceModal(false)}
                            style={{
                                position: "absolute",
                                top: "18px",
                                right: "18px",
                                background: "none",
                                border: "none",
                                fontSize: "18px",
                                cursor: "pointer",
                                color: "#8a7536"
                            }}
                        >
                            ✕
                        </button>

                        <span style={{ fontSize: "11px", fontWeight: "800", color: "#c98e1b", textTransform: "uppercase" }}>
                            CREATE SERVICE LISTING
                        </span>
                        <h2 style={{ margin: "4px 0 16px 0", color: "#24202b" }}>
                            Add New Service
                        </h2>

                        {serviceActionError && (
                            <div style={{
                                padding: "10px 14px",
                                background: "#ffebeb",
                                border: "1px solid #ffb3b3",
                                borderRadius: "8px",
                                color: "#c41c1c",
                                fontSize: "13px",
                                marginBottom: "16px"
                            }}>
                                {serviceActionError}
                            </div>
                        )}

                        {serviceActionSuccess && (
                            <div style={{
                                padding: "10px 14px",
                                background: "#e1faea",
                                border: "1px solid #a3e9be",
                                borderRadius: "8px",
                                color: "#107c39",
                                fontSize: "13px",
                                marginBottom: "16px",
                                fontWeight: "700"
                            }}>
                                ✓ {serviceActionSuccess}
                            </div>
                        )}

                        <form onSubmit={handleAddService}>
                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Service Name / Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Master Chef Home Cooking"
                                    value={newServiceName}
                                    onChange={(e) => setNewServiceName(e.target.value)}
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Category *
                                </label>
                                <select
                                    required
                                    value={newServiceCategory}
                                    onChange={(e) => setNewServiceCategory(e.target.value)}
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                >
                                    {categories.map((cat) => (
                                        <option key={cat.category_id} value={cat.category_id}>
                                            {cat.category_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                        Price (₹) *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        placeholder="500"
                                        value={newServicePrice}
                                        onChange={(e) => setNewServicePrice(e.target.value)}
                                        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                        Duration (Mins)
                                    </label>
                                    <input
                                        type="number"
                                        min="15"
                                        value={newServiceDuration}
                                        onChange={(e) => setNewServiceDuration(e.target.value)}
                                        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Service Location / Area
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Indiranagar & Koramangala"
                                    value={newServiceLocation}
                                    onChange={(e) => setNewServiceLocation(e.target.value)}
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Service Image (Upload Real Work Photo)
                                </label>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setServiceImagePreview(URL.createObjectURL(file));
                                                setServiceImageUploading(true);
                                                try {
                                                    const url = await handleUploadImageFile(file);
                                                    if (url) setNewServiceImage(url);
                                                } catch (err) {
                                                    alert(err.message || "Failed to upload image.");
                                                } finally {
                                                    setServiceImageUploading(false);
                                                }
                                            }
                                        }}
                                        style={{ fontSize: "13px", flex: 1 }}
                                    />
                                    {serviceImageUploading && <span style={{ fontSize: "12px", color: "#c98e1b" }}>Uploading...</span>}
                                </div>
                                {newServiceImage && (
                                    <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                                        <img
                                            src={newServiceImage}
                                            alt="Selected preview"
                                            style={{ width: "80px", height: "55px", objectFit: "cover", borderRadius: "8px", border: "1px solid #ebd08d" }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setNewServiceImage("");
                                                setServiceImagePreview("");
                                            }}
                                            style={{
                                                padding: "4px 8px",
                                                borderRadius: "6px",
                                                border: "1px solid #fecaca",
                                                background: "#fef2f2",
                                                color: "#b91c1c",
                                                fontSize: "11px",
                                                cursor: "pointer"
                                            }}
                                        >
                                            Remove Image
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Description & Service Highlights *
                                </label>
                                <textarea
                                    rows="3"
                                    required
                                    placeholder="Describe your service scope, materials used, hygiene protocols..."
                                    value={newServiceDescription}
                                    onChange={(e) => setNewServiceDescription(e.target.value)}
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px", resize: "vertical" }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddServiceModal(false)}
                                    style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #ebd08d", background: "#fff", color: "#835b0a", fontWeight: "700", cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={serviceActionLoading}
                                    style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #e4a62b, #c98e1b)", color: "#fff", fontWeight: "700", cursor: serviceActionLoading ? "not-allowed" : "pointer" }}
                                >
                                    {serviceActionLoading ? "Publishing..." : "Publish Service"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================
                EDIT SERVICE MODAL (MEMBER 2)
            ================================ */}
            {editingService && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(35, 27, 8, 0.45)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "20px"
                }}>
                    <div style={{
                        background: "#ffffff",
                        borderRadius: "20px",
                        padding: "28px",
                        maxWidth: "520px",
                        width: "100%",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
                        border: "1px solid #f1e0a8",
                        position: "relative"
                    }}>
                        <button
                            type="button"
                            onClick={() => setEditingService(null)}
                            style={{
                                position: "absolute",
                                top: "18px",
                                right: "18px",
                                background: "none",
                                border: "none",
                                fontSize: "18px",
                                cursor: "pointer",
                                color: "#8a7536"
                            }}
                        >
                            ✕
                        </button>

                        <span style={{ fontSize: "11px", fontWeight: "800", color: "#c98e1b", textTransform: "uppercase" }}>
                            MODIFY SERVICE LISTING
                        </span>
                        <h2 style={{ margin: "4px 0 16px 0", color: "#24202b" }}>
                            Edit Service
                        </h2>

                        {serviceActionError && (
                            <div style={{
                                padding: "10px 14px",
                                background: "#ffebeb",
                                border: "1px solid #ffb3b3",
                                borderRadius: "8px",
                                color: "#c41c1c",
                                fontSize: "13px",
                                marginBottom: "16px"
                            }}>
                                {serviceActionError}
                            </div>
                        )}

                        {serviceActionSuccess && (
                            <div style={{
                                padding: "10px 14px",
                                background: "#e1faea",
                                border: "1px solid #a3e9be",
                                borderRadius: "8px",
                                color: "#107c39",
                                fontSize: "13px",
                                marginBottom: "16px",
                                fontWeight: "700"
                            }}>
                                ✓ {serviceActionSuccess}
                            </div>
                        )}

                        <form onSubmit={handleUpdateService}>
                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Service Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editingService.service_name}
                                    onChange={(e) => setEditingService({ ...editingService, service_name: e.target.value })}
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                        Price (₹)
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={editingService.price}
                                        onChange={(e) => setEditingService({ ...editingService, price: e.target.value })}
                                        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                        Availability
                                    </label>
                                    <select
                                        value={editingService.availability ? "true" : "false"}
                                        onChange={(e) => setEditingService({ ...editingService, availability: e.target.value === "true" })}
                                        style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                    >
                                        <option value="true">Active (Accepting Bookings)</option>
                                        <option value="false">Paused (Unavailable)</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={editingService.location || ""}
                                    onChange={(e) => setEditingService({ ...editingService, location: e.target.value })}
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Service Image (Upload Real Work Photo)
                                </label>
                                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,image/gif"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setServiceImageUploading(true);
                                                try {
                                                    const url = await handleUploadImageFile(file);
                                                    if (url) setEditingService({ ...editingService, image_url: url });
                                                } catch (err) {
                                                    alert(err.message || "Failed to upload image.");
                                                } finally {
                                                    setServiceImageUploading(false);
                                                }
                                            }
                                        }}
                                        style={{ fontSize: "13px", flex: 1 }}
                                    />
                                    {serviceImageUploading && <span style={{ fontSize: "12px", color: "#c98e1b" }}>Uploading...</span>}
                                </div>
                                {editingService.image_url && (
                                    <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                                        <img
                                            src={editingService.image_url}
                                            alt="Current service preview"
                                            style={{ width: "80px", height: "55px", objectFit: "cover", borderRadius: "8px", border: "1px solid #ebd08d" }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setEditingService({ ...editingService, image_url: null })}
                                            style={{
                                                padding: "4px 8px",
                                                borderRadius: "6px",
                                                border: "1px solid #fecaca",
                                                background: "#fef2f2",
                                                color: "#b91c1c",
                                                fontSize: "11px",
                                                cursor: "pointer"
                                            }}
                                        >
                                            Remove Image
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Description
                                </label>
                                <textarea
                                    rows="3"
                                    value={editingService.description || ""}
                                    onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px", resize: "vertical" }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingService(null)}
                                    style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #ebd08d", background: "#fff", color: "#835b0a", fontWeight: "700", cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={serviceActionLoading}
                                    style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #e4a62b, #c98e1b)", color: "#fff", fontWeight: "700", cursor: serviceActionLoading ? "not-allowed" : "pointer" }}
                                >
                                    {serviceActionLoading ? "Saving Changes..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================
                BOOKING DETAILS MODAL
            ================================ */}
            {selectedBookingDetails && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(35, 27, 8, 0.45)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "20px"
                }}>
                    <div style={{
                        background: "#ffffff",
                        borderRadius: "20px",
                        padding: "28px",
                        maxWidth: "480px",
                        width: "100%",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
                        border: "1px solid #f1e0a8",
                        position: "relative"
                    }}>
                        <button
                            type="button"
                            onClick={() => setSelectedBookingDetails(null)}
                            style={{
                                position: "absolute",
                                top: "18px",
                                right: "18px",
                                background: "none",
                                border: "none",
                                fontSize: "18px",
                                cursor: "pointer",
                                color: "#8a7536"
                            }}
                        >
                            ✕
                        </button>

                        <span style={{ fontSize: "11px", fontWeight: "800", color: "#c98e1b", textTransform: "uppercase" }}>
                            ORDER SPECIFICATION & CUSTOMER INFO
                        </span>
                        <h2 style={{ margin: "4px 0 16px 0", color: "#24202b" }}>
                            {selectedBookingDetails.services?.service_name}
                        </h2>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
                            <div>
                                <span style={{ color: "#7a6b47" }}>Customer Name:</span>
                                <div style={{ fontWeight: "700", color: "#24202b" }}>
                                    {selectedBookingDetails.customer?.full_name || "Valued Client"}
                                </div>
                            </div>

                            <div>
                                <span style={{ color: "#7a6b47" }}>Customer Contact:</span>
                                <div style={{ color: "#382d12" }}>
                                    📞 {selectedBookingDetails.customer?.phone || "Phone provided on dispatch"} · ✉️ {selectedBookingDetails.customer?.email || "Email on file"}
                                </div>
                            </div>

                            <div>
                                <span style={{ color: "#7a6b47" }}>Service Delivery Address:</span>
                                <div style={{ color: "#382d12", fontWeight: "600" }}>
                                    📍 {selectedBookingDetails.address}
                                </div>
                            </div>

                            <div>
                                <span style={{ color: "#7a6b47" }}>Scheduled Slot:</span>
                                <div style={{ fontWeight: "700", color: "#24202b" }}>
                                    📅 {selectedBookingDetails.booking_date} at {selectedBookingDetails.booking_time}
                                </div>
                            </div>

                            <div style={{ borderTop: "1px solid #ebd08d", paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontWeight: "700", color: "#24202b" }}>Amount Due:</span>
                                <strong style={{ fontSize: "18px", color: "#c98e1b" }}>
                                    ₹{selectedBookingDetails.total_amount}
                                </strong>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedBookingDetails(null)}
                            style={{
                                width: "100%",
                                marginTop: "20px",
                                padding: "12px",
                                background: "#c98e1b",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "10px",
                                fontWeight: "700",
                                cursor: "pointer"
                            }}
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            )}

            {/* ================================
                PROFILE MODAL
            ================================ */}
            {showProfileModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(35, 27, 8, 0.4)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "20px"
                }}>
                    <div style={{
                        background: "#ffffff",
                        borderRadius: "20px",
                        padding: "30px",
                        maxWidth: "460px",
                        width: "100%",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
                        border: "1px solid #f1e0a8",
                        position: "relative"
                    }}>
                        <button
                            type="button"
                            onClick={() => setShowProfileModal(false)}
                            style={{
                                position: "absolute",
                                top: "18px",
                                right: "18px",
                                background: "none",
                                border: "none",
                                fontSize: "18px",
                                cursor: "pointer",
                                color: "#8a7536"
                            }}
                        >
                            ✕
                        </button>

                        <div style={{ marginBottom: "20px" }}>
                            <span style={{ fontSize: "11px", fontWeight: "800", color: "#c98e1b", textTransform: "uppercase" }}>
                                Provider Profile
                            </span>
                            <h2 style={{ margin: "4px 0 0 0", color: "#24202b" }}>
                                {user?.isProfileBuilt ? "Edit Provider Profile" : "Build Provider Profile"}
                            </h2>
                        </div>

                        {profileError && (
                            <div style={{
                                padding: "10px 14px",
                                background: "#ffebeb",
                                border: "1px solid #ffb3b3",
                                borderRadius: "8px",
                                color: "#c41c1c",
                                fontSize: "13px",
                                marginBottom: "16px"
                            }}>
                                {profileError}
                            </div>
                        )}

                        {profileSuccess && (
                            <div style={{
                                padding: "10px 14px",
                                background: "#e1faea",
                                border: "1px solid #a3e9be",
                                borderRadius: "8px",
                                color: "#107c39",
                                fontSize: "13px",
                                marginBottom: "16px",
                                fontWeight: "700"
                            }}>
                                ✓ {profileSuccess}
                            </div>
                        )}

                        <form onSubmit={handleSaveProfile}>
                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Full Name / Business Name
                                </label>
                                <input
                                    type="text"
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Contact Phone
                                </label>
                                <input
                                    type="tel"
                                    value={profilePhone}
                                    onChange={(e) => setProfilePhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                />
                            </div>

                            <div style={{ padding: "14px", background: "#fefbf3", border: "1px solid #ebd08d", borderRadius: "12px", marginBottom: "20px" }}>
                                <div style={{ fontSize: "12px", fontWeight: "800", color: "#835b0a", marginBottom: "10px", textTransform: "uppercase" }}>
                                    📍 Primary Service Base Location
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                            Base City *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Kottayam, Bengaluru"
                                            value={profileCity}
                                            onChange={(e) => setProfileCity(e.target.value)}
                                            style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px", background: "#ffffff" }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                            State
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Kerala, Karnataka"
                                            value={profileState}
                                            onChange={(e) => setProfileState(e.target.value)}
                                            style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px", background: "#ffffff" }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                            PIN Code
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 686001"
                                            value={profilePincode}
                                            onChange={(e) => setProfilePincode(e.target.value)}
                                            style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px", background: "#ffffff" }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                            Country
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="India"
                                            value={profileCountry}
                                            onChange={(e) => setProfileCountry(e.target.value)}
                                            style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px", background: "#ffffff" }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                        Workshop / Office Base Address
                                    </label>
                                    <textarea
                                        rows="2"
                                        value={profileAddress}
                                        onChange={(e) => setProfileAddress(e.target.value)}
                                        placeholder="Enter your street/shop address..."
                                        style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px", background: "#ffffff", resize: "vertical" }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setShowProfileModal(false)}
                                    style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #ebd08d", background: "#fff", color: "#835b0a", fontWeight: "700", cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={profileLoading}
                                    style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #e4a62b, #c98e1b)", color: "#fff", fontWeight: "700", cursor: profileLoading ? "not-allowed" : "pointer" }}
                                >
                                    {profileLoading ? "Saving..." : "Save Profile"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================
                FEATURE 4: ADD PORTFOLIO MODAL
            ================================ */}
            {showAddPortfolioModal && (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(35, 27, 8, 0.5)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "20px"
                }}>
                    <div style={{
                        background: "#ffffff",
                        borderRadius: "20px",
                        padding: "28px",
                        maxWidth: "500px",
                        width: "100%",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
                        border: "1px solid #f1e0a8",
                        position: "relative"
                    }}>
                        <button
                            type="button"
                            onClick={() => setShowAddPortfolioModal(false)}
                            style={{
                                position: "absolute",
                                top: "18px",
                                right: "18px",
                                background: "none",
                                border: "none",
                                fontSize: "18px",
                                cursor: "pointer",
                                color: "#8a7536"
                            }}
                        >
                            ✕
                        </button>

                        <span style={{ fontSize: "11px", fontWeight: "800", color: "#c98e1b", textTransform: "uppercase" }}>
                            PORTFOLIO SHOWCASE
                        </span>
                        <h2 style={{ margin: "4px 0 16px 0", color: "#24202b" }}>
                            Upload Work Photo
                        </h2>

                        <form onSubmit={handleAddPortfolioItem}>
                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Select Real Work Image *
                                </label>
                                <input
                                    type="file"
                                    required
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setPortfolioFile(file);
                                            setPortfolioPreview(URL.createObjectURL(file));
                                        }
                                    }}
                                    style={{ width: "100%", fontSize: "13px" }}
                                />
                                {portfolioPreview && (
                                    <div style={{ marginTop: "12px", height: "160px", borderRadius: "10px", overflow: "hidden", border: "1px solid #ebd08d" }}>
                                        <img src={portfolioPreview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    </div>
                                )}
                            </div>

                            <div style={{ marginBottom: "16px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Caption / Description of Work
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Bridal blouse with heavy zari thread embroidery..."
                                    value={portfolioCaption}
                                    onChange={(e) => setPortfolioCaption(e.target.value)}
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                />
                            </div>

                            <div style={{ marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                                <input
                                    type="checkbox"
                                    id="portfolioPrimaryCheck"
                                    checked={portfolioIsPrimary}
                                    onChange={(e) => setPortfolioIsPrimary(e.target.checked)}
                                    style={{ width: "16px", height: "16px", cursor: "pointer" }}
                                />
                                <label htmlFor="portfolioPrimaryCheck" style={{ fontSize: "13px", fontWeight: "600", color: "#382d12", cursor: "pointer" }}>
                                    Set as primary portfolio cover image
                                </label>
                            </div>

                            <div style={{ display: "flex", gap: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAddPortfolioModal(false)}
                                    style={{ flex: 1, padding: "12px", borderRadius: "10px", border: "1px solid #ebd08d", background: "#fff", color: "#835b0a", fontWeight: "700", cursor: "pointer" }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={portfolioActionLoading}
                                    style={{ flex: 2, padding: "12px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #e4a62b, #c98e1b)", color: "#fff", fontWeight: "700", cursor: portfolioActionLoading ? "not-allowed" : "pointer" }}
                                >
                                    {portfolioActionLoading ? "Uploading..." : "Publish to Portfolio"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ================================
                FEATURE 2: IDENTITY VERIFICATION MODAL
            ================================ */}
            <VerificationModal
                isOpen={showVerificationModal}
                onClose={() => setShowVerificationModal(false)}
                onVerificationUpdated={(isVerified) => {
                    updateUser({ is_verified: isVerified });
                }}
            />
        </div>
    );
}

export default ProviderDashboard;