import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
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
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [profileSuccess, setProfileSuccess] = useState("");

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

    // Initial Load
    useEffect(() => {
        fetchCategories();
        if (user?.id) {
            fetchMyServices();
        }
        if (token) {
            fetchProviderBookings();
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
                    address: profileAddress
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to update provider profile.");
            }

            updateUser(data.user);
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

                <div className="provider-navbar-right">
                    <button className="notification-button" title="Notifications">
                        🔔
                        <span className="notification-dot"></span>
                    </button>

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
                    <div className="sidebar-label">PROVIDER MENU</div>

                    <button
                        onClick={() => setActiveTab("dashboard")}
                        className={`sidebar-item ${activeTab === "dashboard" ? "active" : ""}`}
                        style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                    >
                        <span>🏠</span>
                        Dashboard Overview
                    </button>

                    <button
                        onClick={() => setActiveTab("services")}
                        className={`sidebar-item ${activeTab === "services" ? "active" : ""}`}
                        style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                    >
                        <span>🛠</span>
                        My Services
                        <span className="sidebar-count">{myServices.length}</span>
                    </button>

                    <button
                        onClick={() => setActiveTab("bookings")}
                        className={`sidebar-item ${activeTab === "bookings" ? "active" : ""}`}
                        style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}
                    >
                        <span>📅</span>
                        Customer Bookings
                        {activeBookingsCount > 0 && (
                            <span className="sidebar-count" style={{ background: "#c98e1b", color: "#fff" }}>
                                {activeBookingsCount}
                            </span>
                        )}
                    </button>

                    <div className="sidebar-divider"></div>

                    <div className="sidebar-promo">
                        <span>💡 Pro Tip</span>
                        <p>Keep your service prices competitive and respond to booking requests quickly to earn top provider badges.</p>
                    </div>
                </aside>

                {/* MAIN CONTENT AREA */}
                <main className="provider-main">

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
                                    <span className="section-label">MEMBER 2 · SERVICE MANAGEMENT</span>
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
                                    <span className="section-label">MEMBER 3 · BOOKING WORKFLOW</span>
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
                                                        <div style={{ marginTop: "4px" }}>
                                                            <span style={{
                                                                padding: "4px 12px",
                                                                borderRadius: "20px",
                                                                fontSize: "12px",
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
                                    Image URL (Optional)
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://images.unsplash.com/..."
                                    value={newServiceImage}
                                    onChange={(e) => setNewServiceImage(e.target.value)}
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px" }}
                                />
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

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Operating City / Address
                                </label>
                                <textarea
                                    rows="3"
                                    value={profileAddress}
                                    onChange={(e) => setProfileAddress(e.target.value)}
                                    placeholder="Enter your service base address..."
                                    style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #ebd08d", fontSize: "14px", resize: "vertical" }}
                                />
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
        </div>
    );
}

export default ProviderDashboard;