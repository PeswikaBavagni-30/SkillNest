import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

function CustomerDashboard() {
    const navigate = useNavigate();
    const { user, updateUser, logoutUser } = useAuth();

    const [showProfileModal, setShowProfileModal] = useState(false);
    const [profileName, setProfileName] = useState(user?.name || "");
    const [profilePhone, setProfilePhone] = useState(user?.phone || "");
    const [profileAddress, setProfileAddress] = useState(user?.address || "");
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [profileSuccess, setProfileSuccess] = useState("");

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
            const response = await fetch("http://localhost:5000/api/auth/profile", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
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
            setProfileSuccess("Profile built successfully!");
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

    return (
        <div className="dashboard-page">

            {/* ================================
          BACKGROUND DECORATIONS
          ================================ */}

            <div className="dashboard-bubble bubble-one"></div>
            <div className="dashboard-bubble bubble-two"></div>
            <div className="dashboard-bubble bubble-three"></div>

            <div className="dashboard-ring ring-one"></div>
            <div className="dashboard-ring ring-two"></div>


            {/* ================================
          NAVBAR
          ================================ */}

            <header className="dashboard-navbar">

                {/* Logo */}

                <Link to="/dashboard" className="dashboard-logo">

                    <div className="mini-leaf-logo">

                        <span></span>
                        <span></span>
                        <span></span>

                    </div>

                    <span>SkillNest</span>

                </Link>


                {/* Search */}

                <div className="dashboard-search">

                    <span>⌕</span>

                    <input
                        type="text"
                        placeholder="Search for services..."
                    />

                </div>


                {/* Right side */}

                <div className="navbar-actions">

                    <button className="notification-button">
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
                            {user?.isProfileBuilt && user?.name
                                ? user.name.charAt(0).toUpperCase()
                                : "C"}
                        </div>

                        <div className="profile-info">

                            <strong>
                                {user?.isProfileBuilt && user?.name
                                    ? user.name
                                    : "Customer"}
                            </strong>

                            <span>
                                {user?.isProfileBuilt ? "Customer" : "Build Profile"}
                            </span>

                        </div>

                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        title="Logout from SkillNest"
                        style={{
                            background: "#fffaf0",
                            border: "1px solid #dfc776",
                            borderRadius: "18px",
                            padding: "6px 13px",
                            color: "#9c7606",
                            fontSize: "11px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "5px"
                        }}
                    >
                        <span>🚪</span> Logout
                    </button>

                </div>

            </header>


            {/* ================================
          MAIN CONTENT
          ================================ */}

            <main className="dashboard-content">

                {/* Build Profile Prompt Banner if profile is incomplete */}
                {!user?.isProfileBuilt && (
                    <div style={{
                        background: "linear-gradient(135deg, #fffcf4, #fef8e7)",
                        border: "1px solid #ebd382",
                        borderRadius: "16px",
                        padding: "16px 22px",
                        marginBottom: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "14px",
                        boxShadow: "0 4px 14px rgba(223, 178, 47, 0.08)"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "24px" }}>📋</span>
                            <div>
                                <h4 style={{ margin: "0 0 3px 0", color: "#6e5200", fontSize: "15px", fontWeight: "700" }}>
                                    Your Profile Is Not Built Yet
                                </h4>
                                <p style={{ margin: 0, color: "#8a7536", fontSize: "13px" }}>
                                    Build and complete your profile with your phone and city to personalize your SkillNest experience.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowProfileModal(true)}
                            style={{
                                background: "linear-gradient(135deg, #e3a92b, #c98e1b)",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "10px",
                                padding: "9px 18px",
                                fontWeight: "700",
                                fontSize: "13px",
                                cursor: "pointer",
                                boxShadow: "0 3px 8px rgba(201, 142, 27, 0.25)"
                            }}
                        >
                            Build Profile Now →
                        </button>
                    </div>
                )}


                {/* ================================
            WELCOME SECTION
            ================================ */}

                <section className="welcome-section">

                    <div>

                        <p className="welcome-small">
                            CUSTOMER DASHBOARD
                        </p>

                        <h1>
                            {user?.isProfileBuilt && user?.name
                                ? `Good morning, ${user.name} 👋`
                                : "Welcome to SkillNest 👋"}
                        </h1>

                        <p className="welcome-description">
                            Find the right people for the job,
                            whenever you need them.
                        </p>

                    </div>

                </section>



                {/* ================================
            SEARCH HERO
            ================================ */}

                <section className="service-search-card">

                    <div className="search-card-content">

                        <div>

                            <span className="gold-label">
                                FIND A SERVICE
                            </span>

                            <h2>
                                What do you need help with?
                            </h2>

                            <p>
                                Discover skilled and trusted providers
                                on SkillNest.
                            </p>

                        </div>


                        <div className="large-search">

                            <span>⌕</span>

                            <input
                                type="text"
                                placeholder="Search for a service..."
                            />

                            <button>
                                Search
                            </button>

                        </div>

                    </div>

                </section>


                {/* ================================
            CATEGORIES
            ================================ */}

                <section className="dashboard-section">

                    <div className="section-header">

                        <div>

                            <span className="section-label">
                                EXPLORE
                            </span>

                            <h2>
                                Popular Categories
                            </h2>

                        </div>

                        <button className="view-all-button">
                            View all →
                        </button>

                    </div>


                    <div className="category-grid">


                        <div className="category-card">

                            <div className="category-icon">
                                🔧
                            </div>

                            <h3>
                                Repair
                            </h3>

                            <p>
                                24 services
                            </p>

                        </div>


                        <div className="category-card">

                            <div className="category-icon">
                                🧹
                            </div>

                            <h3>
                                Cleaning
                            </h3>

                            <p>
                                18 services
                            </p>

                        </div>


                        <div className="category-card">

                            <div className="category-icon">
                                💻
                            </div>

                            <h3>
                                Technology
                            </h3>

                            <p>
                                31 services
                            </p>

                        </div>


                        <div className="category-card">

                            <div className="category-icon">
                                📚
                            </div>

                            <h3>
                                Tutoring
                            </h3>

                            <p>
                                15 services
                            </p>

                        </div>


                        <div className="category-card">

                            <div className="category-icon">
                                🎨
                            </div>

                            <h3>
                                Design
                            </h3>

                            <p>
                                21 services
                            </p>

                        </div>


                        <div className="category-card">

                            <div className="category-icon">
                                📷
                            </div>

                            <h3>
                                Photography
                            </h3>

                            <p>
                                12 services
                            </p>

                        </div>

                    </div>

                </section>


                {/* ================================
            RECOMMENDED SERVICES
            ================================ */}

                <section className="dashboard-section">

                    <div className="section-header">

                        <div>

                            <span className="section-label">
                                RECOMMENDED
                            </span>

                            <h2>
                                Services for You
                            </h2>

                        </div>

                        <button className="view-all-button">
                            View all →
                        </button>

                    </div>


                    <div className="service-grid">


                        {/* Service 1 */}

                        <div className="service-card">

                            <div className="service-image repair-image">
                                🔧
                            </div>

                            <div className="service-card-body">

                                <div className="service-top">

                                    <span className="service-category">
                                        HOME REPAIR
                                    </span>

                                    <span className="verified-badge">
                                        ✓ Verified
                                    </span>

                                </div>

                                <h3>
                                    Electrical Repair
                                </h3>

                                <p className="provider-name">
                                    by Ravi Kumar
                                </p>

                                <div className="service-rating">

                                    <span>
                                        ★ 4.8
                                    </span>

                                    <span>
                                        (127 reviews)
                                    </span>

                                </div>

                                <div className="service-bottom">

                                    <strong>
                                        ₹500
                                    </strong>

                                    <button>
                                        Book Now →
                                    </button>

                                </div>

                            </div>

                        </div>


                        {/* Service 2 */}

                        <div className="service-card">

                            <div className="service-image cleaning-image">
                                🧹
                            </div>

                            <div className="service-card-body">

                                <div className="service-top">

                                    <span className="service-category">
                                        CLEANING
                                    </span>

                                    <span className="verified-badge">
                                        ✓ Verified
                                    </span>

                                </div>

                                <h3>
                                    Home Deep Cleaning
                                </h3>

                                <p className="provider-name">
                                    by Anjali Services
                                </p>

                                <div className="service-rating">

                                    <span>
                                        ★ 4.7
                                    </span>

                                    <span>
                                        (89 reviews)
                                    </span>

                                </div>

                                <div className="service-bottom">

                                    <strong>
                                        ₹800
                                    </strong>

                                    <button>
                                        Book Now →
                                    </button>

                                </div>

                            </div>

                        </div>


                        {/* Service 3 */}

                        <div className="service-card">

                            <div className="service-image tech-image">
                                💻
                            </div>

                            <div className="service-card-body">

                                <div className="service-top">

                                    <span className="service-category">
                                        TECHNOLOGY
                                    </span>

                                    <span className="verified-badge">
                                        ✓ Verified
                                    </span>

                                </div>

                                <h3>
                                    Website Development
                                </h3>

                                <p className="provider-name">
                                    by Arjun Tech
                                </p>

                                <div className="service-rating">

                                    <span>
                                        ★ 4.9
                                    </span>

                                    <span>
                                        (64 reviews)
                                    </span>

                                </div>

                                <div className="service-bottom">

                                    <strong>
                                        ₹1,500
                                    </strong>

                                    <button>
                                        Book Now →
                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>


                {/* ================================
            MY BOOKINGS
            ================================ */}

                <section className="dashboard-section bookings-section">

                    <div className="section-header">

                        <div>

                            <span className="section-label">
                                YOUR ACTIVITY
                            </span>

                            <h2>
                                Upcoming Bookings
                            </h2>

                        </div>

                        <button className="view-all-button">
                            View all →
                        </button>

                    </div>


                    <div className="booking-card">

                        <div className="booking-icon">
                            🔧
                        </div>


                        <div className="booking-details">

                            <span className="service-category">
                                HOME REPAIR
                            </span>

                            <h3>
                                Electrical Repair
                            </h3>

                            <p>
                                Ravi Kumar · Tomorrow, 10:00 AM
                            </p>

                        </div>


                        <div className="booking-status pending">
                            Pending
                        </div>


                        <button className="booking-action">
                            View →
                        </button>

                    </div>


                    <div className="booking-card">

                        <div className="booking-icon cleaning-booking">
                            🧹
                        </div>


                        <div className="booking-details">

                            <span className="service-category">
                                CLEANING
                            </span>

                            <h3>
                                Home Deep Cleaning
                            </h3>

                            <p>
                                Anjali Services · 15 Sept, 2:00 PM
                            </p>

                        </div>


                        <div className="booking-status accepted">
                            Accepted
                        </div>


                        <button className="booking-action">
                            View →
                        </button>

                    </div>

                </section>


                {/* ================================
            QUICK STATS
            ================================ */}

                <section className="quick-stats">

                    <div className="stat-card">

                        <div className="stat-icon">
                            📅
                        </div>

                        <div>

                            <strong>
                                8
                            </strong>

                            <span>
                                Completed Services
                            </span>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            ⭐
                        </div>

                        <div>

                            <strong>
                                5
                            </strong>

                            <span>
                                Reviews Given
                            </span>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon">
                            ❤️
                        </div>

                        <div>

                            <strong>
                                3
                            </strong>

                            <span>
                                Saved Services
                            </span>

                        </div>

                    </div>

                </section>


            </main>


            {/* ================================
          FOOTER
          ================================ */}

            <footer className="dashboard-footer">

                <div className="footer-brand">
                    SkillNest
                </div>

                <span>
                    Learn • Offer • Grow
                </span>

                <span>
                    © 2026 SkillNest
                </span>

            </footer>

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
                            <span style={{
                                fontSize: "11px",
                                fontWeight: "800",
                                color: "#c98e1b",
                                textTransform: "uppercase",
                                letterSpacing: "1px"
                            }}>
                                User Profile
                            </span>
                            <h3 style={{ margin: "4px 0 6px 0", color: "#362907", fontSize: "20px" }}>
                                {user?.isProfileBuilt ? "Edit Your Profile" : "Build Your Profile"}
                            </h3>
                            <p style={{ margin: 0, fontSize: "13px", color: "#7a6b47" }}>
                                Fill in your details below so your dashboard is fully personalized.
                            </p>
                        </div>

                        {profileError && (
                            <div style={{
                                background: "#fee2e2",
                                color: "#991b1b",
                                padding: "10px 14px",
                                borderRadius: "10px",
                                fontSize: "13px",
                                marginBottom: "16px"
                            }}>
                                {profileError}
                            </div>
                        )}

                        {profileSuccess && (
                            <div style={{
                                background: "#dcfce7",
                                color: "#166534",
                                padding: "10px 14px",
                                borderRadius: "10px",
                                fontSize: "13px",
                                marginBottom: "16px"
                            }}>
                                ✓ {profileSuccess}
                            </div>
                        )}

                        <form onSubmit={handleSaveProfile}>
                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#544317", marginBottom: "6px" }}>
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={profileName}
                                    onChange={(e) => setProfileName(e.target.value)}
                                    placeholder="Your full name"
                                    style={{
                                        width: "100%",
                                        padding: "11px 14px",
                                        borderRadius: "10px",
                                        border: "1px solid #e2d19b",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: "14px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#544317", marginBottom: "6px" }}>
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    required
                                    value={profilePhone}
                                    onChange={(e) => setProfilePhone(e.target.value)}
                                    placeholder="+91 91234 56789"
                                    style={{
                                        width: "100%",
                                        padding: "11px 14px",
                                        borderRadius: "10px",
                                        border: "1px solid #e2d19b",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#544317", marginBottom: "6px" }}>
                                    City / Address
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={profileAddress}
                                    onChange={(e) => setProfileAddress(e.target.value)}
                                    placeholder="Indiranagar, Bangalore"
                                    style={{
                                        width: "100%",
                                        padding: "11px 14px",
                                        borderRadius: "10px",
                                        border: "1px solid #e2d19b",
                                        fontSize: "14px",
                                        boxSizing: "border-box"
                                    }}
                                />
                            </div>

                            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                                <button
                                    type="button"
                                    onClick={() => setShowProfileModal(false)}
                                    style={{
                                        background: "#f3f0e6",
                                        border: "none",
                                        borderRadius: "10px",
                                        padding: "10px 18px",
                                        fontWeight: "600",
                                        fontSize: "13px",
                                        cursor: "pointer",
                                        color: "#544317"
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={profileLoading}
                                    style={{
                                        background: "linear-gradient(135deg, #e3a92b, #c98e1b)",
                                        border: "none",
                                        borderRadius: "10px",
                                        padding: "10px 22px",
                                        fontWeight: "700",
                                        fontSize: "13px",
                                        cursor: profileLoading ? "not-allowed" : "pointer",
                                        color: "#ffffff",
                                        boxShadow: "0 4px 10px rgba(201, 142, 27, 0.25)"
                                    }}
                                >
                                    {profileLoading ? "Saving Profile..." : "Save & Build Profile"}
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