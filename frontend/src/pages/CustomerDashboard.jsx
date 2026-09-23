import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "../components/NotificationBell";
import PaymentModal from "../components/PaymentModal";
import ModeSwitcher from "../components/ModeSwitcher";
import ProviderPortfolioModal from "../components/ProviderPortfolioModal";
import CustomServiceRequestModal from "../components/CustomServiceRequestModal";
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

function extractCityFromAddress(addr) {
    if (!addr || typeof addr !== "string") return "";
    const KNOWN_CITIES = [
        "bengaluru", "bangalore", "kottayam", "hyderabad", "kochi", "mumbai",
        "chennai", "delhi", "new delhi", "pune", "kolkata", "changanassery",
        "thiruvananthapuram", "trivandrum", "kozhikode", "calicut", "thrissur",
        "ahmedabad", "jaipur", "lucknow", "chandigarh", "mysuru", "mysore", "gurugram", "gurgaon"
    ];
    const clean = addr.toLowerCase();
    for (const kc of KNOWN_CITIES) {
        if (clean.includes(kc)) {
            if (kc === "bengaluru" || kc === "bangalore") return "Bengaluru";
            if (kc === "kottayam") return "Kottayam";
            if (kc === "hyderabad") return "Hyderabad";
            if (kc === "kochi") return "Kochi";
            if (kc === "mumbai") return "Mumbai";
            if (kc === "chennai") return "Chennai";
            if (kc === "delhi" || kc === "new delhi") return "Delhi";
            if (kc === "pune") return "Pune";
            if (kc === "kolkata") return "Kolkata";
            if (kc === "changanassery") return "Changanassery";
            return kc.charAt(0).toUpperCase() + kc.slice(1);
        }
    }
    const parts = addr.split(/[,\-\n]/).map((p) => p.trim()).filter(Boolean);
    for (const p of parts) {
        if (!/^\d{6}$/.test(p) && p.length > 2 && !["india", "bharat"].includes(p.toLowerCase())) {
            return p;
        }
    }
    return "";
}

function CustomerDashboard() {
    const navigate = useNavigate();
    const { user, token, updateUser, logoutUser } = useAuth();

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

    // Feature 1: Location Filter & Discovery State
    const [selectedLocationCity, setSelectedLocationCity] = useState(() => {
        return localStorage.getItem("skillnest_customer_city") || user?.city || user?.location?.city || "";
    });
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [tempCityInput, setTempCityInput] = useState("");

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

    // Member 4: Payments State
    const [paymentsMap, setPaymentsMap] = useState({});
    const [paymentModalBooking, setPaymentModalBooking] = useState(null);

    // Book Now Modal State (Feature 1: Structured Location)
    const [bookingModalService, setBookingModalService] = useState(null);
    const [bookingDate, setBookingDate] = useState("");
    const [bookingTime, setBookingTime] = useState("10:00 AM");
    const [bookingAddress, setBookingAddress] = useState(user?.address || "");
    const [bookingCity, setBookingCity] = useState(user?.city || user?.location?.city || "");
    const [bookingState, setBookingState] = useState(user?.state || user?.location?.state || "");
    const [bookingPincode, setBookingPincode] = useState(user?.pincode || user?.location?.pincode || "");
    const [bookingUseProfileLocation, setBookingUseProfileLocation] = useState(true);
    const [bookingSubmitting, setBookingSubmitting] = useState(false);
    const [bookingError, setBookingError] = useState("");
    const [bookingSuccess, setBookingSuccess] = useState("");

    // Booking Details Modal State
    const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);

    // Feature 4: Portfolio Modal State
    const [portfolioModalOpen, setPortfolioModalOpen] = useState(false);
    const [selectedPortfolioProviderId, setSelectedPortfolioProviderId] = useState(null);
    const [selectedPortfolioProviderName, setSelectedPortfolioProviderName] = useState("");

    // Feature 5: Custom Requests State
    const [showCustomRequestModal, setShowCustomRequestModal] = useState(false);
    const [myCustomRequests, setMyCustomRequests] = useState([]);
    const [customRequestsLoading, setCustomRequestsLoading] = useState(false);
    const [acceptingQuoteId, setAcceptingQuoteId] = useState(null);
    const [requestNotice, setRequestNotice] = useState("");

    // Initial data loading
    useEffect(() => {
        fetchCategories();
        fetchServices();
        if (token) {
            fetchCustomerBookings();
            fetchCustomerPayments();
            fetchMyCustomRequests();
        }
    }, [token]);

    // Refetch services when category, search, or location changes
    useEffect(() => {
        fetchServices();
    }, [selectedCategory, searchQuery, selectedLocationCity]);

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
            if (selectedLocationCity && selectedLocationCity.trim()) {
                url += `city=${encodeURIComponent(selectedLocationCity.trim())}&`;
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

    const fetchCustomerPayments = async () => {
        if (!token) return;
        try {
            const res = await fetch("http://localhost:5000/api/payments", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
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
            console.error("Error loading customer payments:", err);
        }
    };

    // Feature 5: Fetch Customer's Custom Requests
    const fetchMyCustomRequests = async () => {
        if (!token) return;
        setCustomRequestsLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/service-requests?my_requests=true", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setMyCustomRequests(data.requests || []);
            }
        } catch (err) {
            console.error("Error loading custom requests:", err);
        } finally {
            setCustomRequestsLoading(false);
        }
    };

    // Customer accepts a provider's quote proposal
    const handleAcceptQuote = async (requestId, responseId) => {
        if (!window.confirm("Accept this provider's quote? A confirmed booking will be scheduled in your account.")) return;
        setAcceptingQuoteId(responseId);
        try {
            const res = await fetch(`http://localhost:5000/api/service-requests/${requestId}/accept`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ response_id: responseId })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || "Failed to accept quote.");
            }
            setRequestNotice("✓ Quote accepted! Confirmed booking created below.");
            fetchMyCustomRequests();
            fetchCustomerBookings();
            fetchCustomerPayments();
            setTimeout(() => setRequestNotice(""), 6000);
        } catch (err) {
            alert(err.message || "Error accepting quote.");
        } finally {
            setAcceptingQuoteId(null);
        }
    };

    // Feature 4: Open Portfolio Modal
    const handleOpenPortfolioModal = (providerId, providerName) => {
        setSelectedPortfolioProviderId(providerId);
        setSelectedPortfolioProviderName(providerName || "SkillNest Partner");
        setPortfolioModalOpen(true);
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
                throw new Error(data.message || "Failed to update profile.");
            }

            updateUser(data.user);
            if (profileCity.trim()) {
                setSelectedLocationCity(profileCity.trim());
                localStorage.setItem("skillnest_customer_city", profileCity.trim());
            }
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
        const derivedCity = user?.city || user?.location?.city || selectedLocationCity || extractCityFromAddress(user?.address) || "";
        setBookingCity(derivedCity);
        setBookingState(user?.state || user?.location?.state || "");
        setBookingPincode(user?.pincode || user?.location?.pincode || "");
        setBookingUseProfileLocation(true);
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

        const detectedFromAddr = extractCityFromAddress(bookingAddress);
        const effectiveCity = bookingUseProfileLocation
            ? (user?.city || user?.location?.city || selectedLocationCity || detectedFromAddr || bookingCity || (bookingModalService?.location || ""))
            : (bookingCity.trim() || detectedFromAddr || (bookingModalService?.location || ""));
        const effectiveState = bookingUseProfileLocation
            ? (user?.state || user?.location?.state || "")
            : bookingState.trim();
        const effectivePincode = bookingUseProfileLocation
            ? (user?.pincode || user?.location?.pincode || "")
            : bookingPincode.trim();
        const effectiveAddress = (bookingAddress || user?.address || "").trim();

        if (!effectiveAddress) {
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
                    address: effectiveAddress,
                    city: effectiveCity,
                    state: effectiveState,
                    pincode: effectivePincode
                })
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to place booking.");
            }

            setBookingSuccess("Booking Confirmed! Provider has been notified.");
            fetchCustomerBookings();
            fetchCustomerPayments();
            window.dispatchEvent(new CustomEvent("skillnest_refresh_notifications"));

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

                <div className="dashboard-navbar-right" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <ModeSwitcher />
                    <NotificationBell />

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
                </section>


                {/* ================================
                    MEMBER 2: POPULAR CATEGORIES
                ================================ */}
                <section className="dashboard-section">
                    <div className="section-header">
                        <div>
                            <span className="section-label">POPULAR CATEGORIES</span>
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
                            <span className="section-label">AVAILABLE SERVICES</span>
                            <h2>Available Services {selectedCategory && "(Filtered)"}</h2>
                        </div>
                        <span style={{ fontSize: "14px", color: "#7a6b47", fontWeight: "600" }}>
                            {services.length} service{services.length === 1 ? "" : "s"} found
                        </span>
                    </div>

                    {/* FEATURE 1: Location-Based Filter Bar */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "12px 18px",
                        background: "linear-gradient(135deg, #fffcf5, #fef8eb)",
                        border: "1px solid #ebd08d",
                        borderRadius: "14px",
                        marginBottom: "20px",
                        flexWrap: "wrap",
                        gap: "12px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <span style={{ fontSize: "22px" }}>📍</span>
                            <div>
                                <div style={{ fontSize: "11px", fontWeight: "800", color: "#8a7536", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                    Delivery City & Area
                                </div>
                                <div style={{ fontSize: "14px", fontWeight: "700", color: "#382d12" }}>
                                    {selectedLocationCity ? (
                                        <span>Showing providers serving: <strong style={{ color: "#c98e1b" }}>{selectedLocationCity}</strong></span>
                                    ) : (
                                        <span>All Service Areas (No city filter active)</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            {selectedLocationCity && (
                                <button
                                    onClick={() => {
                                        setSelectedLocationCity("");
                                        localStorage.removeItem("skillnest_customer_city");
                                    }}
                                    style={{
                                        padding: "6px 12px",
                                        background: "#ffffff",
                                        border: "1px solid #ebd08d",
                                        borderRadius: "8px",
                                        color: "#835b0a",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        cursor: "pointer"
                                    }}
                                    title="Clear city filter and show services nationwide"
                                >
                                    ✕ Clear Filter
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setTempCityInput(selectedLocationCity || "");
                                    setShowLocationModal(true);
                                }}
                                style={{
                                    padding: "7px 16px",
                                    background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                                    border: "none",
                                    borderRadius: "8px",
                                    color: "#ffffff",
                                    fontSize: "12px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    boxShadow: "0 2px 8px rgba(201, 142, 27, 0.25)"
                                }}
                            >
                                📍 {selectedLocationCity ? "Change Location" : "Set Your City"}
                            </button>
                        </div>
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
                                            backgroundImage: srv.image_url ? `url(${srv.image_url})` : "none",
                                            backgroundColor: "#fef6e2",
                                            backgroundSize: "cover",
                                            backgroundPosition: "center",
                                            height: "170px",
                                            position: "relative",
                                            borderRadius: "16px 16px 0 0",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}
                                    >
                                        {!srv.image_url && (
                                            <div style={{ textAlign: "center", color: "#835b0a" }}>
                                                <span style={{ fontSize: "42px" }}>{getCategoryIcon(srv.service_categories?.category_name)}</span>
                                                <div style={{ fontSize: "11px", fontWeight: "700", marginTop: "4px" }}>
                                                    {srv.service_categories?.category_name || "Professional Service"}
                                                </div>
                                            </div>
                                        )}
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
                                            <span className="verified-badge" style={{
                                                background: srv.provider?.is_verified ? "#f0fdf4" : "#fefce8",
                                                color: srv.provider?.is_verified ? "#15803d" : "#a16207",
                                                border: srv.provider?.is_verified ? "1px solid #86efac" : "1px solid #fde047",
                                                padding: "3px 8px",
                                                borderRadius: "12px",
                                                fontSize: "11px",
                                                fontWeight: "700"
                                            }}>
                                                {srv.provider?.is_verified ? "✓ Identity Verified" : "SkillNest Pro"}
                                            </span>
                                        </div>

                                        <h3>{srv.service_name}</h3>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "4px 0" }}>
                                            <p className="provider-name" style={{ margin: 0 }}>
                                                by {srv.provider?.full_name || "SkillNest Partner"}
                                            </p>
                                            {srv.provider_id && (
                                                <button
                                                    onClick={() => handleOpenPortfolioModal(srv.provider_id, srv.provider?.full_name)}
                                                    style={{
                                                        background: "#fff9eb",
                                                        border: "1px solid #ebd08d",
                                                        color: "#835b0a",
                                                        fontWeight: "700",
                                                        fontSize: "11px",
                                                        borderRadius: "12px",
                                                        padding: "3px 8px",
                                                        cursor: "pointer"
                                                    }}
                                                    title="View Provider's Real Work Portfolio"
                                                >
                                                    🎨 Portfolio
                                                </button>
                                            )}
                                        </div>

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

                                        <div className="service-rating" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "4px" }}>
                                            <span>★ 4.9</span>
                                            <span style={{ fontSize: "12px", color: "#8a7536", display: "inline-flex", alignItems: "center", gap: "4px" }} title="Service Coverage Area">
                                                📍 {srv.service_areas_text || srv.location || "Local Service Area"}
                                            </span>
                                        </div>
                                        {selectedLocationCity && (
                                            <div style={{ fontSize: "11px", fontWeight: "700", color: "#15803d", margin: "2px 0 6px 0" }}>
                                                ✓ Confirmed Coverage: {selectedLocationCity}
                                            </div>
                                        )}

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
                    FEATURE 5: CUSTOM SERVICE REQUESTS & PROPOSALS
                ================================ */}
                <section className="dashboard-section" style={{ background: "linear-gradient(180deg, #fffdf8 0%, #ffffff 100%)", border: "1px solid #ebd08d", borderRadius: "16px", padding: "24px", marginBottom: "30px" }}>
                    <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                        <div>
                            <span className="section-label" style={{ color: "#c98e1b", fontWeight: "700", letterSpacing: "0.5px", fontSize: "12px" }}>CUSTOM SERVICE REQUESTS</span>
                            <h2 style={{ margin: "4px 0 0 0", fontSize: "22px", color: "#1e293b" }}>My Custom Requirements & Proposals</h2>
                            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#64748b" }}>
                                Need specialized help? Post a custom requirement and verified SkillNest providers will submit quotes.
                            </p>
                        </div>
                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                className="view-all-button"
                                onClick={fetchMyCustomRequests}
                                style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", background: "#f8fafc", cursor: "pointer", fontWeight: "600" }}
                            >
                                ↻ Refresh
                            </button>
                            <button
                                onClick={() => setShowCustomRequestModal(true)}
                                style={{
                                    background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                                    color: "#ffffff",
                                    border: "none",
                                    padding: "9px 18px",
                                    borderRadius: "10px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    boxShadow: "0 4px 12px rgba(201, 142, 27, 0.25)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                <span>➕ Post Custom Requirement</span>
                            </button>
                        </div>
                    </div>

                    {requestNotice && (
                        <div style={{ padding: "12px 16px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", color: "#166534", marginBottom: "16px", fontWeight: "600", fontSize: "14px" }}>
                            {requestNotice}
                        </div>
                    )}

                    {customRequestsLoading ? (
                        <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>Loading your custom requests...</div>
                    ) : myCustomRequests.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "36px 20px", background: "#fafafa", borderRadius: "12px", border: "1px dashed #e2e8f0" }}>
                            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📋</div>
                            <h3 style={{ margin: "0 0 6px 0", color: "#334155", fontSize: "16px" }}>No custom requests posted yet</h3>
                            <p style={{ margin: "0 0 16px 0", color: "#64748b", fontSize: "13px", maxWidth: "450px", marginLeft: "auto", marginRight: "auto" }}>
                                Can't find an exact match among standard services? Post your unique requirements and receive custom quotes directly from top providers.
                            </p>
                            <button
                                onClick={() => setShowCustomRequestModal(true)}
                                style={{
                                    background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                                    color: "#ffffff",
                                    border: "none",
                                    padding: "9px 20px",
                                    borderRadius: "8px",
                                    fontWeight: "700",
                                    cursor: "pointer"
                                }}
                            >
                                Post Your First Requirement
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                            {myCustomRequests.map((req) => (
                                <div
                                    key={req.id}
                                    style={{
                                        border: "1px solid #e2e8f0",
                                        borderRadius: "12px",
                                        padding: "18px",
                                        background: "#ffffff",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                                <h3 style={{ margin: 0, fontSize: "17px", color: "#0f172a" }}>{req.title}</h3>
                                                <span
                                                    style={{
                                                        fontSize: "11px",
                                                        padding: "3px 8px",
                                                        borderRadius: "12px",
                                                        fontWeight: "700",
                                                        textTransform: "uppercase",
                                                        background: req.status === "open" ? "#dbeafe" : req.status === "accepted" ? "#dcfce7" : "#f1f5f9",
                                                        color: req.status === "open" ? "#1d4ed8" : req.status === "accepted" ? "#15803d" : "#475569"
                                                    }}
                                                >
                                                    {req.status}
                                                </span>
                                            </div>
                                            <p style={{ margin: "4px 0 10px 0", color: "#475569", fontSize: "13.5px", lineHeight: "1.5" }}>
                                                {req.description}
                                            </p>
                                            <div style={{ display: "flex", gap: "14px", fontSize: "12.5px", color: "#64748b", flexWrap: "wrap" }}>
                                                <span>🏷️ <strong>Category:</strong> {req.category_name || "General"}</span>
                                                <span>💰 <strong>Budget:</strong> {req.budget_max ? `Up to ₹${req.budget_max}` : "Flexible"}</span>
                                                {req.preferred_date && <span>📅 <strong>Target Date:</strong> {req.preferred_date}</span>}
                                                <span>⏰ <strong>Posted:</strong> {new Date(req.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Received Quotes / Proposals */}
                                    <div style={{ marginTop: "14px", borderTop: "1px dashed #e2e8f0", paddingTop: "12px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                            <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                                💬 Provider Proposals ({req.responses ? req.responses.length : 0})
                                            </span>
                                            {req.status === "open" && req.responses && req.responses.length > 0 && (
                                                <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "600" }}>
                                                    Quotes available for review
                                                </span>
                                            )}
                                        </div>

                                        {(!req.responses || req.responses.length === 0) ? (
                                            <p style={{ margin: 0, fontSize: "12.5px", color: "#94a3b8", fontStyle: "italic" }}>
                                                Waiting for providers to review and submit quotes...
                                            </p>
                                        ) : (
                                            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                                {req.responses.map((resp) => {
                                                    const isSelected = req.accepted_response_id === resp.id || resp.status === "accepted";
                                                    return (
                                                        <div
                                                            key={resp.id}
                                                            style={{
                                                                display: "flex",
                                                                justifyContent: "space-between",
                                                                alignItems: "center",
                                                                padding: "12px 14px",
                                                                background: isSelected ? "#f0fdf4" : "#f8fafc",
                                                                borderRadius: "8px",
                                                                border: isSelected ? "1px solid #86efac" : "1px solid #e2e8f0",
                                                                flexWrap: "wrap",
                                                                gap: "10px"
                                                            }}
                                                        >
                                                            <div style={{ flex: 1, minWidth: "200px" }}>
                                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                                    <strong style={{ color: "#1e293b", fontSize: "13.5px" }}>
                                                                        {resp.provider_name || "SkillNest Partner"}
                                                                    </strong>
                                                                    <span style={{ fontSize: "14px", fontWeight: "800", color: "#c98e1b" }}>
                                                                        ₹{resp.quote_price}
                                                                    </span>
                                                                    {resp.turnaround_days && (
                                                                        <span style={{ fontSize: "11px", color: "#64748b", background: "#e2e8f0", padding: "2px 6px", borderRadius: "4px" }}>
                                                                            ⏳ {resp.turnaround_days} days
                                                                        </span>
                                                                    )}
                                                                    {isSelected && (
                                                                        <span style={{ fontSize: "11px", color: "#15803d", fontWeight: "700", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px" }}>
                                                                            ✓ ACCEPTED & BOOKED
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "#475569" }}>
                                                                    "{resp.proposal_message}"
                                                                </p>
                                                            </div>

                                                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                                <button
                                                                    onClick={() => handleOpenPortfolioModal(resp.provider_id, resp.provider_name)}
                                                                    style={{
                                                                        padding: "6px 12px",
                                                                        borderRadius: "6px",
                                                                        border: "1px solid #cbd5e1",
                                                                        background: "#ffffff",
                                                                        fontSize: "12px",
                                                                        fontWeight: "600",
                                                                        cursor: "pointer",
                                                                        color: "#475569"
                                                                    }}
                                                                >
                                                                    🎨 View Portfolio
                                                                </button>
                                                                {req.status === "open" && (
                                                                    <button
                                                                        onClick={() => handleAcceptQuote(req.id, resp.id)}
                                                                        disabled={acceptingQuoteId === resp.id}
                                                                        style={{
                                                                            padding: "7px 14px",
                                                                            borderRadius: "6px",
                                                                            border: "none",
                                                                            background: "linear-gradient(135deg, #10b981, #059669)",
                                                                            color: "#ffffff",
                                                                            fontSize: "12.5px",
                                                                            fontWeight: "700",
                                                                            cursor: acceptingQuoteId === resp.id ? "not-allowed" : "pointer"
                                                                        }}
                                                                    >
                                                                        {acceptingQuoteId === resp.id ? "Accepting..." : "Accept & Book →"}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
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
                            <span className="section-label">MY BOOKINGS & APPOINTMENTS</span>
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
                                                        const isFailed = p && p.payment_status === "failed";
                                                        return (
                                                            <span style={{
                                                                padding: "4px 10px",
                                                                borderRadius: "20px",
                                                                fontSize: "11px",
                                                                fontWeight: "800",
                                                                textTransform: "uppercase",
                                                                background: isPaid ? "#e1faea" : isFailed ? "#ffebeb" : "#fff8e6",
                                                                color: isPaid ? "#107c39" : isFailed ? "#c41c1c" : "#835b0a",
                                                                border: isPaid ? "1px solid #b7ebd0" : "1px solid #ebd08d"
                                                            }}>
                                                                {isPaid ? "✓ Paid" : isFailed ? "✕ Pay Failed" : "Unpaid"}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                            </div>

                                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                                {/* Member 4: Pay Now Action */}
                                                {(() => {
                                                    const p = paymentsMap[bk.booking_id];
                                                    const isPaid = p && p.payment_status === "success";
                                                    if (!isPaid && !isCancelled) {
                                                        return (
                                                            <button
                                                                onClick={() => setPaymentModalBooking(bk)}
                                                                style={{
                                                                    padding: "8px 14px",
                                                                    background: "linear-gradient(135deg, #c98e1b, #a7700c)",
                                                                    border: "none",
                                                                    borderRadius: "8px",
                                                                    fontWeight: "700",
                                                                    fontSize: "13px",
                                                                    color: "#ffffff",
                                                                    cursor: "pointer",
                                                                    boxShadow: "0 2px 6px rgba(201,142,27,0.3)"
                                                                }}
                                                            >
                                                                💳 Pay Now
                                                            </button>
                                                        );
                                                    }
                                                    if (isPaid) {
                                                        return (
                                                            <button
                                                                onClick={() => navigate(`/payment/${bk.booking_id}`)}
                                                                style={{
                                                                    padding: "8px 12px",
                                                                    background: "#e1faea",
                                                                    border: "1px solid #b7ebd0",
                                                                    borderRadius: "8px",
                                                                    fontWeight: "700",
                                                                    fontSize: "12px",
                                                                    color: "#107c39",
                                                                    cursor: "pointer"
                                                                }}
                                                            >
                                                                Receipt
                                                            </button>
                                                        );
                                                    }
                                                    return null;
                                                })()}

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
                <span>SkillNest Customer Portal · Trusted Local Services</span>
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

                            {/* FEATURE 1: Booking Location Selection */}
                            <div style={{
                                marginBottom: "20px",
                                padding: "14px",
                                background: "#fefbf3",
                                border: "1px solid #ebd08d",
                                borderRadius: "12px"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                                    <label style={{ fontSize: "12px", fontWeight: "800", color: "#835b0a", textTransform: "uppercase" }}>
                                        📍 Service Delivery Location
                                    </label>
                                    <span style={{ fontSize: "11px", color: "#7a6b47", background: "#fef3c7", padding: "2px 8px", borderRadius: "10px" }} title="Provider Coverage">
                                        Coverage: {bookingModalService.service_areas_text || bookingModalService.location || "Local Service Area"}
                                    </span>
                                </div>

                                <div style={{ display: "flex", gap: "16px", marginBottom: "12px", flexWrap: "wrap" }}>
                                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", fontWeight: "600", color: "#382d12" }}>
                                        <input
                                            type="radio"
                                            name="bookingLocType"
                                            checked={bookingUseProfileLocation}
                                            onChange={() => setBookingUseProfileLocation(true)}
                                            style={{ accentColor: "#c98e1b" }}
                                        />
                                        Profile Location ({user?.city || selectedLocationCity || "Saved Profile"})
                                    </label>
                                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer", fontWeight: "600", color: "#382d12" }}>
                                        <input
                                            type="radio"
                                            name="bookingLocType"
                                            checked={!bookingUseProfileLocation}
                                            onChange={() => setBookingUseProfileLocation(false)}
                                            style={{ accentColor: "#c98e1b" }}
                                        />
                                        Deliver to Another City / Address
                                    </label>
                                </div>

                                {bookingUseProfileLocation ? (
                                    <div>
                                        <div style={{ fontSize: "12px", color: "#6b6255", marginBottom: "8px" }}>
                                            <strong>Delivering to:</strong> {(() => {
                                                const dCity = user?.city || user?.location?.city || selectedLocationCity || extractCityFromAddress(bookingAddress) || (bookingModalService?.location || "");
                                                return dCity ? `${dCity}${user?.state ? `, ${user.state}` : ''}` : "Local Delivery Area";
                                            })()}
                                        </div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                            Street Address / Apartment *
                                        </label>
                                        <textarea
                                            rows="2"
                                            value={bookingAddress}
                                            onChange={(e) => setBookingAddress(e.target.value)}
                                            placeholder="Enter your flat/house no, street, landmark..."
                                            required
                                            style={{
                                                width: "100%",
                                                padding: "8px 12px",
                                                borderRadius: "8px",
                                                border: "1px solid #ebd08d",
                                                fontSize: "13px",
                                                outline: "none",
                                                background: "#ffffff"
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                                            <div>
                                                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                                    Delivery City *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. Kottayam, Bengaluru"
                                                    value={bookingCity}
                                                    onChange={(e) => setBookingCity(e.target.value)}
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
                                                    value={bookingState}
                                                    onChange={(e) => setBookingState(e.target.value)}
                                                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px", background: "#ffffff" }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "10px", marginBottom: "10px" }}>
                                            <div>
                                                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                                    PIN Code
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. 686001"
                                                    value={bookingPincode}
                                                    onChange={(e) => setBookingPincode(e.target.value)}
                                                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px", background: "#ffffff" }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                                    Street Address *
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="e.g. Flat 3A, Baker Junction"
                                                    value={bookingAddress}
                                                    onChange={(e) => setBookingAddress(e.target.value)}
                                                    style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px", background: "#ffffff" }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
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

                            <div style={{ padding: "14px", background: "#fefbf3", border: "1px solid #ebd08d", borderRadius: "12px", marginBottom: "20px" }}>
                                <div style={{ fontSize: "12px", fontWeight: "800", color: "#835b0a", marginBottom: "10px", textTransform: "uppercase" }}>
                                    📍 Default Delivery Location
                                </div>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                                    <div>
                                        <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                                            City
                                        </label>
                                        <input
                                            type="text"
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
                                        Street Address / House Details
                                    </label>
                                    <textarea
                                        rows="2"
                                        value={profileAddress}
                                        onChange={(e) => setProfileAddress(e.target.value)}
                                        placeholder="Flat 4B, Baker Hills, Collectorate P.O..."
                                        style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px", background: "#ffffff", resize: "vertical" }}
                                    />
                                </div>
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

            {/* Payment Modal */}
            {paymentModalBooking && (
                <PaymentModal
                    booking={paymentModalBooking}
                    onClose={() => setPaymentModalBooking(null)}
                    onPaymentSuccess={() => {
                        fetchCustomerBookings();
                        fetchCustomerPayments();
                        window.dispatchEvent(new CustomEvent("skillnest_refresh_notifications"));
                    }}
                />
            )}

            {/* Feature 4: Provider Portfolio Modal */}
            <ProviderPortfolioModal
                isOpen={portfolioModalOpen}
                onClose={() => setPortfolioModalOpen(false)}
                providerId={selectedPortfolioProviderId}
                providerName={selectedPortfolioProviderName}
            />

            {/* Feature 5: Post Custom Service Request Modal */}
            <CustomServiceRequestModal
                isOpen={showCustomRequestModal}
                onClose={() => setShowCustomRequestModal(false)}
                categories={categories}
                onRequestCreated={() => {
                    fetchMyCustomRequests();
                    setRequestNotice("✓ Custom requirement posted successfully! Providers can now submit quotes.");
                    setTimeout(() => setRequestNotice(""), 6000);
                }}
            />

            {/* FEATURE 1: Location Discovery Modal */}
            {showLocationModal && (
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
                        maxWidth: "460px",
                        width: "100%",
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
                        border: "1px solid #ebd08d",
                        position: "relative"
                    }}>
                        <button
                            type="button"
                            onClick={() => setShowLocationModal(false)}
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
                            SERVICE DELIVERY AREA
                        </span>
                        <h2 style={{ margin: "4px 0 8px 0", color: "#24202b" }}>
                            Select Service Location
                        </h2>
                        <p style={{ margin: "0 0 18px 0", fontSize: "13px", color: "#7a6b47" }}>
                            Choose your delivery city to discover providers who serve your exact area.
                        </p>

                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "8px" }}>
                                Popular Cities
                            </label>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {["Kottayam", "Bengaluru", "Hyderabad", "Kochi", "Mumbai", "Chennai"].map((city) => (
                                    <button
                                        key={city}
                                        type="button"
                                        onClick={() => {
                                            setSelectedLocationCity(city);
                                            localStorage.setItem("skillnest_customer_city", city);
                                            setShowLocationModal(false);
                                        }}
                                        style={{
                                            padding: "6px 14px",
                                            borderRadius: "16px",
                                            border: (selectedLocationCity || "").toLowerCase() === city.toLowerCase()
                                                ? "2px solid #c98e1b"
                                                : "1px solid #ebd08d",
                                            background: (selectedLocationCity || "").toLowerCase() === city.toLowerCase()
                                                ? "#fff6de"
                                                : "#ffffff",
                                            color: "#382d12",
                                            fontSize: "13px",
                                            fontWeight: "600",
                                            cursor: "pointer"
                                        }}
                                    >
                                        📍 {city}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                                Or Enter Custom City / PIN
                            </label>
                            <div style={{ display: "flex", gap: "8px" }}>
                                <input
                                    type="text"
                                    placeholder="Type city name (e.g. Changanassery)..."
                                    value={tempCityInput}
                                    onChange={(e) => setTempCityInput(e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: "10px 14px",
                                        borderRadius: "10px",
                                        border: "1px solid #ebd08d",
                                        fontSize: "14px",
                                        outline: "none"
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (tempCityInput.trim()) {
                                            setSelectedLocationCity(tempCityInput.trim());
                                            localStorage.setItem("skillnest_customer_city", tempCityInput.trim());
                                            setShowLocationModal(false);
                                        }
                                    }}
                                    style={{
                                        padding: "10px 18px",
                                        background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                                        border: "none",
                                        borderRadius: "10px",
                                        color: "#ffffff",
                                        fontWeight: "700",
                                        fontSize: "13px",
                                        cursor: "pointer"
                                    }}
                                >
                                    Apply
                                </button>
                            </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "14px", borderTop: "1px solid #f1e0a8" }}>
                            {user?.city ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedLocationCity(user.city);
                                        localStorage.setItem("skillnest_customer_city", user.city);
                                        setShowLocationModal(false);
                                    }}
                                    style={{
                                        background: "none",
                                        border: "none",
                                        color: "#c98e1b",
                                        fontSize: "13px",
                                        fontWeight: "700",
                                        cursor: "pointer",
                                        textDecoration: "underline"
                                    }}
                                >
                                    Use Profile Location ({user.city})
                                </button>
                            ) : <div></div>}

                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedLocationCity("");
                                    localStorage.removeItem("skillnest_customer_city");
                                    setShowLocationModal(false);
                                }}
                                style={{
                                    background: "#f8fafc",
                                    border: "1px solid #cbd5e1",
                                    padding: "6px 14px",
                                    borderRadius: "8px",
                                    color: "#64748b",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                }}
                            >
                                Clear (Show All)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CustomerDashboard;