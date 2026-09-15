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
    if (name.includes("garden") || name.includes("plant")) return "🌱";
    if (name.includes("fitness") || name.includes("yoga")) return "🧘";
    return "✨";
};

function CustomerDashboard() {
    const navigate = useNavigate();
    const { user, token, updateUser, logoutUser } = useAuth();

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
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [services, setServices] = useState([]);
    const [servicesLoading, setServicesLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Member 3: Bookings State
    const [bookings, setBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(true);
    const [bookingFilterTab, setBookingFilterTab] = useState("all");

    // Book Now Modal State
    const [bookingModalService, setBookingModalService] = useState(null);
    const [bookingDate, setBookingDate] = useState("");
    const [bookingTime, setBookingTime] = useState("10:00 AM");
    const [bookingAddress, setBookingAddress] = useState(user?.address || "");
    const [bookingSubmitting, setBookingSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState("");
    const [bookingSuccess, setBookingSuccess] = useState("");

    // Booking Details Modal State
    const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);

    // Initial data loading
    useEffect(() => {
        fetchCategories();
        fetchServices();
        if (token) {
            fetchCustomerBookings();
        }
    }, [token]);

    // Refetch services when category or search changes
    useEffect(() => {
        fetchServices();
    }, [selectedCategory, searchQuery]);

    const fetchCategories = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/categories");
            const data = await res.json();
            if (data.success) {
                setCategories(data.categories || []);
            }
        } catch (err) {
            console.error("Error loading categories:", err);
        }
    };

    const fetchServices = async () => {
        setServicesLoading(true);
        try {
            let url = "http://localhost:5000/api/services?";
            if (selectedCategory) {
                url += `category_id=${encodeURIComponent(selectedCategory)}&`;
            }
            if (searchQuery.trim()) {
                url += `search=${encodeURIComponent(searchQuery.trim())}&`;
            }
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setServices(data.services || []);
            }
        } catch (err) {
            console.error("Error loading services:", err);
        } finally {
            setServicesLoading(false);
        }
    };

    const fetchCustomerBookings = async () => {
        if (!token) return;
        setBookingsLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/bookings/customer", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setBookings(data.bookings || []);
            }
        } catch (err) {
            console.error("Error loading customer bookings:", err);
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
                throw new Error(data.message || "Failed to update profile.");
            }

            updateUser(data.user);
            setProfileSuccess("Profile updated successfully!");
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

    // Open Book Now modal
    const handleOpenBookModal = (service) => {
        setBookingModalService(service);
        setBookingDate(new Date().toISOString().split("T")[0]);
        setBookingTime("10:00 AM");
        setBookingAddress(user?.address || "");
        setBookingError("");
        setBookingSuccess("");
    };

    // Submit Booking
    const handleConfirmBooking = async (e) => {
        e.preventDefault();
        if (!token) {
            setBookingError("Please log in to book this service.");
            return;
        }

        if (!bookingDate) {
            setBookingError("Please select a booking date.");
            return;
        }

        if (!bookingAddress.trim()) {
            setBookingError("Please enter your service delivery address.");
            return;
        }

        setBookingSubmitting(true);
        setBookingError("");
        setBookingSuccess("");

        try {
            const response = await fetch("http://localhost:5000/api/bookings", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    service_id: bookingModalService.service_id,
                    booking_date: bookingDate,
                    booking_time: bookingTime,
                    address: bookingAddress.trim()
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to place booking.");
            }

            setBookingSuccess("Booking Confirmed! Provider has been notified.");
            fetchCustomerBookings();

            setTimeout(() => {
                setBookingModalService(null);
                setBookingSuccess("");
            }, 1500);
        } catch (err) {
            setBookingError(err.message || "Error creating booking.");
        } finally {
            setBookingSubmitting(false);
        }
    };

    // Cancel Booking
    const handleCancelBooking = async (bookingId) => {
        if (!window.confirm("Are you sure you want to cancel this booking?")) return;

        try {
            const response = await fetch(`http://localhost:5000/api/bookings/${bookingId}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: "cancelled" })
            });

            const data = await response.json();
            if (data.success) {
                fetchCustomerBookings();
            } else {
                alert(data.message || "Failed to cancel booking.");
            }
        } catch (err) {
            console.error("Cancel booking error:", err);
            alert("Unable to cancel booking at this time.");
        }
    };

    // Filter bookings by tab
    const filteredBookings = bookings.filter((b) => {
        if (bookingFilterTab === "all") return true;
        return (b.status || "").toLowerCase() === bookingFilterTab.toLowerCase();
    });

    const todayDateStr = new Date().toISOString().split("T")[0];

    return (
        <div className="dashboard-page">

            {/* BACKGROUND DECORATIONS */}
            <div className="dashboard-bubble bubble-one"></div>
            <div className="dashboard-bubble bubble-two"></div>
            <div className="dashboard-bubble bubble-three"></div>
            <div className="dashboard-ring ring-one"></div>
            <div className="dashboard-ring ring-two"></div>

            {/* NAVBAR */}
            <header className="dashboard-navbar">
                <Link to="/dashboard" className="dashboard-logo">
                    <div className="mini-leaf-logo">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <span>SkillNest</span>
                </Link>

                <div className="dashboard-search">
                    <span>⌕</span>
                    <input
                        type="text"
                        placeholder="Search for services or skills..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery("")}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#8a7536", marginRight: "10px" }}
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="dashboard-navbar-right">
                    <button className="notification-button" title="Notifications">
                        🔔
                        <span className="notification-dot"></span>
                    </button>

                    <div
                        className="profile-mini"
                        onClick={() => setShowProfileModal(true)}
                        title="Click to view or edit your profile"
                        style={{ cursor: "pointer" }}
                    >
                        <div className="profile-avatar">
                            {user?.name ? user.name.charAt(0).toUpperCase() : "C"}
                        </div>
                        <div className="profile-info">
                            <strong>{user?.name || "Customer"}</strong>
                            <span>{user?.isProfileBuilt ? "Customer" : "Build Profile"}</span>
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

            {/* DASHBOARD CONTENT */}
            <main className="dashboard-content">

                {/* HERO BANNER */}
                <section className="dashboard-hero">
                    <div className="hero-text">
                        <span className="hero-label">SKILLNEST VERIFIED SERVICES</span>
                        <h1>
                            Welcome back, <span>{user?.name?.split(" ")[0] || "Friend"}!</span>
                        </h1>
                        <p>
                            Discover expert home chefs, deep cleaners, beauticians, and technicians. All services are vetted, transparently priced, and delivered to your doorstep.
                        </p>
                    </div>

                    <div className="hero-action-card">
                        <div className="action-card-header">
                            <span className="action-tag">Need Assistance?</span>
                            <h3>Custom Skill Request</h3>
                        </div>
                        <p>Can't find what you need? Describe your task and get custom offers from trusted professionals.</p>
                        <button 
                            className="post-task-button"
                            onClick={() => {
                                const section = document.getElementById("services-section");
                                section?.scrollIntoView({ behavior: "smooth" });
                            }}
                        >
                            Browse All Services ↓
                        </button>
                    </div>
                </section>

                {/* PROFILE COMPLETION BANNER */}
                {!user?.isProfileBuilt && (
                    <div className="profile-prompt-banner">
                        <div className="prompt-left">
                            <div className="prompt-badge">Action Required</div>
                            <h3>Complete Your Profile</h3>
                            <p>Add your phone number and address to speed up your booking checkout and receive live SMS updates.</p>
                        </div>
                        <button className="prompt-cta" onClick={() => setShowProfileModal(true)}>
                            Build Profile Now →
                        </button>
                    </div>
                )}

                {/* ================================
                    MEMBER 2: POPULAR CATEGORIES
                ================================ */}
                <section className="dashboard-section">
                    <div className="section-header">
                        <div>
                            <span className="section-label">MEMBER 2 · SERVICE CATEGORIES</span>
                            <h2>Explore Service Categories</h2>
                        </div>
                        {selectedCategory && (
                            <button
                                className="view-all-button"
                                onClick={() => setSelectedCategory(null)}
                                style={{ background: "#c98e1b", color: "#fff" }}
                            >
                                Clear Filter (Show All)
                            </button>
                        )}
                    </div>

                    <div className="category-grid">
                        <div
                            className={`category-card ${!selectedCategory ? "active-category" : ""}`}
                            onClick={() => setSelectedCategory(null)}
                            style={{
                                cursor: "pointer",
                                border: !selectedCategory ? "2px solid #c98e1b" : "1px solid #f1e0a8",
                                background: !selectedCategory ? "#fff6de" : "#ffffff"
                            }}
                        >
                            <div className="category-icon">🌟</div>
                            <h3>All Categories</h3>
                            <p>{services.length} services</p>
                        </div>

                        {categories.map((cat) => (
                            <div
                                key={cat.category_id}
                                className={`category-card ${selectedCategory === cat.category_id ? "active-category" : ""}`}
                                onClick={() => setSelectedCategory(cat.category_id)}
                                style={{
                                    cursor: "pointer",
                                    border: selectedCategory === cat.category_id ? "2px solid #c98e1b" : "1px solid #f1e0a8",
                                    background: selectedCategory === cat.category_id ? "#fff6de" : "#ffffff"
                                }}
                            >
                                <div className="category-icon">{getCategoryIcon(cat.category_name)}</div>
                                <h3>{cat.category_name}</h3>
                                <p style={{ fontSize: "12px", color: "#7a6b47" }}>
                                    {cat.description ? cat.description.slice(0, 45) + "..." : "Available now"}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ================================
                    MEMBER 2: AVAILABLE SERVICES
                ================================ */}
                <section className="dashboard-section" id="services-section">
                    <div className="section-header">
                        <div>
                            <span className="section-label">MEMBER 2 · SERVICES CATALOG</span>
                            <h2>Available Services {selectedCategory && "(Filtered)"}</h2>
                        </div>
                        <span style={{ fontSize: "14px", color: "#7a6b47", fontWeight: "600" }}>
                            {services.length} service{services.length === 1 ? "" : "s"} found
                        </span>
                    </div>

                    {servicesLoading ? (
                        <div style={{ textAlign: "center", padding: "40px 0", color: "#8a7536" }}>
                            Loading SkillNest services...
                        </div>
                    ) : services.length === 0 ? (
                        <div style={{
                            textAlign: "center",
                            padding: "50px 20px",
                            background: "#ffffff",
                            borderRadius: "16px",
                            border: "1px dashed #ebd08d"
                        }}>
                            <span style={{ fontSize: "36px" }}>🔍</span>
                            <h3 style={{ marginTop: "12px", color: "#382d12" }}>No services found</h3>
                            <p style={{ color: "#7a6b47", fontSize: "14px" }}>
                                Try selecting another category or clearing your search term.
                            </p>
                            <button
                                onClick={() => { setSelectedCategory(null); setSearchQuery(""); }}
                                style={{
                                    marginTop: "14px",
                                    padding: "8px 20px",
                                    background: "#c98e1b",
                                    color: "#fff",
                                    borderRadius: "8px",
                                    border: "none",
                                    cursor: "pointer",
                                    fontWeight: "600"
                                }}
                            >
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        <div className="service-grid">
                            {services.map((srv) => (
                                <div className="service-card" key={srv.service_id}>
                                    <div
                                        className="service-image"
                                        style={{
                                            backgroundImage: `url(${srv.image_url})`,
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                            height: "170px",
                                            position: "relative",
                                            borderRadius: "16px 16px 0 0"
                                        }}
                                    >
                                        <div style={{
                                            position: "absolute",
                                            top: "12px",
                                            left: "12px",
                                            background: "rgba(255,255,255,0.92)",
                                            padding: "4px 10px",
                                            borderRadius: "20px",
                                            fontSize: "12px",
                                            fontWeight: "700",
                                            color: "#835b0a"
                                        }}>
                                            ⏱ {srv.duration_minutes || 60} mins
                                        </div>
                                    </div>

                                    <div className="service-card-body">
                                        <div className="service-top">
                                            <span className="service-category">
                                                {srv.service_categories?.category_name || "GENERAL"}
                                            </span>
                                            <span className="verified-badge">
                                                ✓ {srv.provider?.is_verified ? "Verified" : "Pro"}
                                            </span>
                                        </div>

                                        <h3>{srv.service_name}</h3>
                                        <p className="provider-name">
                                            by {srv.provider?.full_name || "SkillNest Partner"}
                                        </p>

                                        <p style={{
                                            fontSize: "13px",
                                            color: "#6b6255",
                                            margin: "8px 0",
                                            lineHeight: "1.4",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden"
                                        }}>
                                            {srv.description}
                                        </p>

                                        <div className="service-rating">
                                            <span>★ 4.9</span>
                                            <span>({srv.location || "Bengaluru"})</span>
                                        </div>

                                        <div className="service-bottom">
                                            <strong>₹{srv.price}</strong>
                                            <button
                                                onClick={() => handleOpenBookModal(srv)}
                                                style={{
                                                    background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                                                    color: "#fff",
                                                    border: "none",
                                                    padding: "9px 18px",
                                                    borderRadius: "10px",
                                                    fontWeight: "700",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                Book Now →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* ================================
                    MEMBER 3: MY BOOKINGS
                ================================ */}
                <section className="dashboard-section">
                    <div className="section-header">
                        <div>
                            <span className="section-label">MEMBER 3 · BOOKING MANAGEMENT</span>
                            <h2>My Service Bookings</h2>
                        </div>
                        <button className="view-all-button" onClick={fetchCustomerBookings}>
                            ↻ Refresh
                        </button>
                    </div>

                    {/* Booking Tabs */}
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
                            Loading your bookings...
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
                            <h3 style={{ marginTop: "10px", color: "#382d12" }}>No {bookingFilterTab} bookings yet</h3>
                            <p style={{ color: "#7a6b47", fontSize: "14px" }}>
                                Explore our verified services above and schedule your first appointment!
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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
                                                    {bk.services?.service_categories?.category_name || "SERVICE"}
                                                </span>
                                                <h3 style={{ margin: "2px 0 4px 0", fontSize: "17px", color: "#24202b" }}>
                                                    {bk.services?.service_name || "Service Booking"}
                                                </h3>
                                                <p style={{ margin: 0, fontSize: "13px", color: "#7a6b47" }}>
                                                    Provider: <strong>{bk.provider?.full_name || "SkillNest Provider"}</strong> · 📅 {bk.booking_date} at {bk.booking_time}
                                                </p>
                                                <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#8a7536" }}>
                                                    📍 {bk.address}
                                                </p>
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

                                            <div style={{ display: "flex", gap: "8px" }}>
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

                                                {(isPending || isAccepted) && (
                                                    <button
                                                        onClick={() => handleCancelBooking(bk.booking_id)}
                                                        style={{
                                                            padding: "8px 14px",
                                                            background: "#ffebeb",
                                                            border: "1px solid #ffcccc",
                                                            borderRadius: "8px",
                                                            fontWeight: "600",
                                                            fontSize: "13px",
                                                            color: "#c41c1c",
                                                            cursor: "pointer"
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* QUICK STATS */}
                <section className="quick-stats">
                    <div className="stat-card">
                        <div className="stat-icon">🌟</div>
                        <div className="stat-info">
                            <strong>{services.length}</strong>
                            <span>Live Services</span>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">📅</div>
                        <div className="stat-info">
                            <strong>{bookings.filter(b => b.status === "pending" || b.status === "accepted").length}</strong>
                            <span>Active Bookings</span>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">✓</div>
                        <div className="stat-info">
                            <strong>{bookings.filter(b => b.status === "completed").length}</strong>
                            <span>Completed Tasks</span>
                        </div>
                    </div>
                </section>
            </main>

            {/* FOOTER */}
            <footer className="dashboard-footer">
                <span>SkillNest Customer Portal · Member 2 & 3 Integrated</span>
                <span>© 2026 SkillNest</span>
            </footer>

            {/* ================================
                MEMBER 3: BOOK NOW MODAL
            ================================ */}
            {bookingModalService && (
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
                        padding: "30px",
                        maxWidth: "500px",
                        width: "100%",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
                        border: "1px solid #f1e0a8",
                        position: "relative"
                    }}>
                        <button
                            type="button"
                            onClick={() => setBookingModalService(null)}
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
                            SCHEDULE SERVICE APPOINTMENT
                        </span>
                        <h2 style={{ margin: "4px 0 16px 0", color: "#24202b" }}>
                            Book {bookingModalService.service_name}
                        </h2>

                        <div style={{
                            background: "#fffaf0",
                            padding: "14px",
                            borderRadius: "12px",
                            border: "1px solid #ebd08d",
                            marginBottom: "18px"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                <span style={{ fontSize: "13px", color: "#68501e" }}>Provider:</span>
                                <strong style={{ fontSize: "13px", color: "#24202b" }}>
                                    {bookingModalService.provider?.full_name || "SkillNest Pro"}
                                </strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                                <span style={{ fontSize: "13px", color: "#68501e" }}>Service Fee:</span>
                                <strong style={{ fontSize: "14px", color: "#c98e1b" }}>
                                    ₹{bookingModalService.price}
                                </strong>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontSize: "13px", color: "#68501e" }}>Estimated Duration:</span>
                                <span style={{ fontSize: "13px", color: "#24202b" }}>
                                    {bookingModalService.duration_minutes || 60} minutes
                                </span>
                            </div>
                        </div>

                        {bookingError && (
                            <div style={{
                                padding: "10px 14px",
                                background: "#ffebeb",
                                border: "1px solid #ffb3b3",
                                borderRadius: "8px",
                                color: "#c41c1c",
                                fontSize: "13px",
                                marginBottom: "16px"
                            }}>
                                {bookingError}
                            </div>
                        )}

                        {bookingSuccess && (
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
                                ✓ {bookingSuccess}
                            </div>
                        )}

                        <form onSubmit={handleConfirmBooking}>
                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Appointment Date *
                                </label>
                                <input
                                    type="date"
                                    min={todayDateStr}
                                    value={bookingDate}
                                    onChange={(e) => setBookingDate(e.target.value)}
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "10px",
                                        border: "1px solid #ebd08d",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Preferred Time Slot *
                                </label>
                                <select
                                    value={bookingTime}
                                    onChange={(e) => setBookingTime(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "10px",
                                        border: "1px solid #ebd08d",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                >
                                    <option value="09:00 AM">09:00 AM - 11:00 AM (Morning)</option>
                                    <option value="11:30 AM">11:30 AM - 01:30 PM (Midday)</option>
                                    <option value="02:00 PM">02:00 PM - 04:00 PM (Afternoon)</option>
                                    <option value="04:30 PM">04:30 PM - 06:30 PM (Evening)</option>
                                    <option value="07:00 PM">07:00 PM - 09:00 PM (Night)</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Service Delivery Address *
                                </label>
                                <textarea
                                    rows="3"
                                    value={bookingAddress}
                                    onChange={(e) => setBookingAddress(e.target.value)}
                                    placeholder="Enter your flat/house no, street, locality, landmark..."
                                    required
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "10px",
                                        border: "1px solid #ebd08d",
                                        fontSize: "14px",
                                        outline: "none",
                                        resize: "vertical"
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setBookingModalService(null)}
                                    style={{
                                        flex: 1,
                                        padding: "12px",
                                        borderRadius: "10px",
                                        border: "1px solid #ebd08d",
                                        background: "#ffffff",
                                        color: "#835b0a",
                                        fontWeight: "700",
                                        cursor: "pointer"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={bookingSubmitting}
                                    style={{
                                        flex: 2,
                                        padding: "12px",
                                        borderRadius: "10px",
                                        border: "none",
                                        background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                                        color: "#ffffff",
                                        fontWeight: "700",
                                        cursor: bookingSubmitting ? "not-allowed" : "pointer"
                                    }}
                                >
                                    {bookingSubmitting ? "Confirming..." : `Confirm Booking (₹${bookingModalService.price})`}
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
                            BOOKING DETAILS & RECEIPT
                        </span>
                        <h2 style={{ margin: "4px 0 16px 0", color: "#24202b" }}>
                            {selectedBookingDetails.services?.service_name}
                        </h2>

                        <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "14px" }}>
                            <div>
                                <span style={{ color: "#7a6b47" }}>Booking ID:</span>
                                <div style={{ fontFamily: "monospace", color: "#382d12", fontWeight: "700" }}>
                                    {selectedBookingDetails.booking_id}
                                </div>
                            </div>

                            <div>
                                <span style={{ color: "#7a6b47" }}>Status:</span>
                                <div style={{ fontWeight: "700", textTransform: "uppercase", color: "#c98e1b" }}>
                                    {selectedBookingDetails.status}
                                </div>
                            </div>

                            <div>
                                <span style={{ color: "#7a6b47" }}>Provider:</span>
                                <div style={{ fontWeight: "700", color: "#24202b" }}>
                                    {selectedBookingDetails.provider?.full_name || "SkillNest Partner"}
                                </div>
                            </div>

                            <div>
                                <span style={{ color: "#7a6b47" }}>Appointment Schedule:</span>
                                <div style={{ fontWeight: "700", color: "#24202b" }}>
                                    📅 {selectedBookingDetails.booking_date} at {selectedBookingDetails.booking_time}
                                </div>
                            </div>

                            <div>
                                <span style={{ color: "#7a6b47" }}>Service Address:</span>
                                <div style={{ color: "#382d12" }}>
                                    {selectedBookingDetails.address}
                                </div>
                            </div>

                            <div style={{ borderTop: "1px solid #ebd08d", paddingTop: "12px", display: "flex", justifyContent: "space-between" }}>
                                <span style={{ fontWeight: "700", color: "#24202b" }}>Total Amount:</span>
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
                                User Profile
                            </span>
                            <h2 style={{ margin: "4px 0 0 0", color: "#24202b" }}>
                                {user?.isProfileBuilt ? "Edit Your Profile" : "Build Your Profile"}
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
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "10px",
                                        border: "1px solid #ebd08d",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={profilePhone}
                                    onChange={(e) => setProfilePhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "10px",
                                        border: "1px solid #ebd08d",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                    Delivery Address / City
                                </label>
                                <textarea
                                    rows="3"
                                    value={profileAddress}
                                    onChange={(e) => setProfileAddress(e.target.value)}
                                    placeholder="Enter your address and city..."
                                    style={{
                                        width: "100%",
                                        padding: "10px 14px",
                                        borderRadius: "10px",
                                        border: "1px solid #ebd08d",
                                        fontSize: "14px",
                                        outline: "none",
                                        resize: "vertical"
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "12px" }}>
                                <button
                                    type="button"
                                    onClick={() => setShowProfileModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: "12px",
                                        borderRadius: "10px",
                                        border: "1px solid #ebd08d",
                                        background: "#ffffff",
                                        color: "#835b0a",
                                        fontWeight: "700",
                                        cursor: "pointer"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={profileLoading}
                                    style={{
                                        flex: 2,
                                        padding: "12px",
                                        borderRadius: "10px",
                                        border: "none",
                                        background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                                        color: "#ffffff",
                                        fontWeight: "700",
                                        cursor: profileLoading ? "not-allowed" : "pointer"
                                    }}
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

export default CustomerDashboard;