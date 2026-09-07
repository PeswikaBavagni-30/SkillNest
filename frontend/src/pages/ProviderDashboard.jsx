import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

function ProviderDashboard() {
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
                throw new Error(data.message || "Failed to update provider profile.");
            }

            updateUser(data.user);
            setProfileSuccess("Provider profile built successfully!");
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
        <div className="provider-dashboard">

            {/* Background decorations */}

            <div className="dashboard-bubble provider-bubble-one"></div>
            <div className="dashboard-bubble provider-bubble-two"></div>

            <div className="dashboard-ring provider-ring-one"></div>


            {/* ================================
          NAVBAR
          ================================ */}

            <header className="provider-navbar">

                <Link to="/provider-dashboard" className="dashboard-logo">

                    <div className="mini-leaf-logo">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>

                    <span>SkillNest</span>

                </Link>


                <div className="provider-navbar-right">

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
                                : "P"}
                        </div>

                        <div className="profile-info">

                            <strong>
                                {user?.isProfileBuilt && user?.name
                                    ? user.name
                                    : "Provider"}
                            </strong>

                            <span>
                                {user?.isProfileBuilt ? "Provider" : "Build Profile"}
                            </span>

                        </div>

                        <span className="profile-arrow">
                            ▾
                        </span>

                    </div>

                </div>

            </header>


            {/* ================================
          DASHBOARD LAYOUT
          ================================ */}

            <div className="provider-layout">


                {/* ================================
            SIDEBAR
            ================================ */}

                <aside className="provider-sidebar">

                    <div className="sidebar-label">
                        PROVIDER MENU
                    </div>


                    <Link
                        to="/provider-dashboard"
                        className="sidebar-item active"
                    >
                        <span>🏠</span>
                        Dashboard
                    </Link>


                    <Link
                        to="#"
                        className="sidebar-item"
                    >
                        <span>🛠</span>
                        My Services
                    </Link>


                    <Link
                        to="#"
                        className="sidebar-item"
                    >
                        <span>📅</span>
                        Bookings

                        <span className="sidebar-count">
                            3
                        </span>

                    </Link>


                    <Link
                        to="#"
                        className="sidebar-item"
                    >
                        <span>💰</span>
                        Earnings
                    </Link>


                    <Link
                        to="#"
                        className="sidebar-item"
                    >
                        <span>⭐</span>
                        Reviews
                    </Link>


                    <Link
                        to="#"
                        className="sidebar-item"
                    >
                        <span>🔔</span>
                        Notifications
                    </Link>


                    <div className="sidebar-divider"></div>


                    <button
                        type="button"
                        onClick={() => setShowProfileModal(true)}
                        className="sidebar-item"
                        style={{
                            background: "none",
                            border: "none",
                            width: "100%",
                            textAlign: "left",
                            cursor: "pointer",
                            fontFamily: "inherit"
                        }}
                    >
                        <span>👤</span>
                        Profile
                    </button>


                    <Link
                        to="#"
                        className="sidebar-item"
                    >
                        <span>⚙️</span>
                        Settings
                    </Link>


                    <button
                        type="button"
                        onClick={handleLogout}
                        className="sidebar-item logout-item"
                        style={{
                            background: "none",
                            border: "none",
                            width: "100%",
                            textAlign: "left",
                            cursor: "pointer",
                            fontFamily: "inherit"
                        }}
                    >
                        <span>🚪</span>
                        Logout
                    </button>

                </aside>


                {/* ================================
            MAIN CONTENT
            ================================ */}

                <main className="provider-content">

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
                                        Your Provider Profile Is Not Built Yet
                                    </h4>
                                    <p style={{ margin: 0, color: "#8a7536", fontSize: "13px" }}>
                                        Complete your provider contact and location details to showcase your business to customers.
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


                    {/* Welcome */}

                    <section className="provider-welcome">

                        <div>

                            <span className="welcome-small">
                                PROVIDER DASHBOARD
                            </span>

                            <h1>
                                {user?.isProfileBuilt && user?.name
                                    ? `Good morning, ${user.name} 👋`
                                    : "Welcome to SkillNest 👋"}
                            </h1>

                            <p>
                                Manage your services and grow your
                                SkillNest business.
                            </p>

                        </div>


                        {/* Requirement 11: Provider Verification Badge */}
                        {user?.is_verified ? (
                            <div className="verified-provider">
                                <span className="verified-check">
                                    ✓
                                </span>
                                <div>
                                    <strong>
                                        Verified Provider
                                    </strong>
                                    <span>
                                        Credentials verified
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="verified-provider" style={{
                                background: "#fffdf5",
                                border: "1px solid #ebd382",
                                color: "#8a6d10"
                            }}>
                                <span className="verified-check" style={{
                                    background: "#fef3c7",
                                    color: "#b45309",
                                    border: "1px solid #fcd34d"
                                }}>
                                    ⏳
                                </span>
                                <div>
                                    <strong style={{ color: "#92400e" }}>
                                        Verification Pending
                                    </strong>
                                    <span style={{ color: "#b45309" }}>
                                        Application under review
                                    </span>
                                </div>
                            </div>
                        )}

                    </section>


                    {/* ================================
              STATS
              ================================ */}

                    <section className="provider-stats">

                        <div className="provider-stat-card">

                            <div className="provider-stat-icon">
                                📅
                            </div>

                            <div>

                                <strong>
                                    24
                                </strong>

                                <span>
                                    Total Bookings
                                </span>

                            </div>

                        </div>


                        <div className="provider-stat-card">

                            <div className="provider-stat-icon">
                                ✓
                            </div>

                            <div>

                                <strong>
                                    18
                                </strong>

                                <span>
                                    Completed
                                </span>

                            </div>

                        </div>


                        <div className="provider-stat-card">

                            <div className="provider-stat-icon">
                                ₹
                            </div>

                            <div>

                                <strong>
                                    ₹12,500
                                </strong>

                                <span>
                                    Total Earnings
                                </span>

                            </div>

                        </div>


                        <div className="provider-stat-card">

                            <div className="provider-stat-icon">
                                ⭐
                            </div>

                            <div>

                                <strong>
                                    4.8
                                </strong>

                                <span>
                                    Average Rating
                                </span>

                            </div>

                        </div>

                    </section>


                    {/* ================================
              SERVICES
              ================================ */}

                    <section className="provider-section">

                        <div className="provider-section-header">

                            <div>

                                <span className="section-label">
                                    YOUR WORK
                                </span>

                                <h2>
                                    My Services
                                </h2>

                            </div>


                            <button className="add-service-button">
                                + Add Service
                            </button>

                        </div>


                        <div className="provider-service-card">

                            <div className="provider-service-icon">
                                🔧
                            </div>


                            <div className="provider-service-info">

                                <span>
                                    HOME REPAIR
                                </span>

                                <h3>
                                    Electrical Repair
                                </h3>

                                <p>
                                    Residential electrical repair and
                                    installation services.
                                </p>

                                <div className="provider-service-meta">

                                    <span>
                                        ⭐ 4.8
                                    </span>

                                    <span>
                                        127 reviews
                                    </span>

                                    <span>
                                        24 bookings
                                    </span>

                                </div>

                            </div>


                            <div className="provider-service-price">

                                <strong>
                                    ₹500
                                </strong>

                                <span>
                                    per service
                                </span>

                            </div>


                            <button className="manage-button">
                                Manage →
                            </button>

                        </div>


                        <div className="provider-service-card">

                            <div className="provider-service-icon cleaning-service">
                                🧹
                            </div>


                            <div className="provider-service-info">

                                <span>
                                    CLEANING
                                </span>

                                <h3>
                                    Home Cleaning
                                </h3>

                                <p>
                                    Professional home cleaning services.
                                </p>

                                <div className="provider-service-meta">

                                    <span>
                                        ⭐ 4.7
                                    </span>

                                    <span>
                                        56 reviews
                                    </span>

                                    <span>
                                        18 bookings
                                    </span>

                                </div>

                            </div>


                            <div className="provider-service-price">

                                <strong>
                                    ₹800
                                </strong>

                                <span>
                                    per service
                                </span>

                            </div>


                            <button className="manage-button">
                                Manage →
                            </button>

                        </div>

                    </section>


                    {/* ================================
              BOOKING REQUESTS
              ================================ */}

                    <section className="provider-section">

                        <div className="provider-section-header">

                            <div>

                                <span className="section-label">
                                    NEEDS YOUR ATTENTION
                                </span>

                                <h2>
                                    Booking Requests
                                </h2>

                            </div>

                            <button className="view-all-button">
                                View all →
                            </button>

                        </div>


                        {/* Request 1 */}

                        <div className="request-card">

                            <div className="customer-avatar">
                                A
                            </div>


                            <div className="request-info">

                                <span>
                                    NEW REQUEST
                                </span>

                                <h3>
                                    Anjali Sharma
                                </h3>

                                <p>
                                    Electrical Repair · Tomorrow,
                                    10:00 AM
                                </p>

                            </div>


                            <div className="request-price">
                                ₹500
                            </div>


                            <div className="request-actions">

                                <button className="accept-button">
                                    ✓ Accept
                                </button>

                                <button className="decline-button">
                                    Decline
                                </button>

                            </div>

                        </div>


                        {/* Request 2 */}

                        <div className="request-card">

                            <div className="customer-avatar avatar-two">
                                P
                            </div>


                            <div className="request-info">

                                <span>
                                    NEW REQUEST
                                </span>

                                <h3>
                                    Priya Nair
                                </h3>

                                <p>
                                    Home Cleaning · 15 Sept,
                                    2:00 PM
                                </p>

                            </div>


                            <div className="request-price">
                                ₹800
                            </div>


                            <div className="request-actions">

                                <button className="accept-button">
                                    ✓ Accept
                                </button>

                                <button className="decline-button">
                                    Decline
                                </button>

                            </div>

                        </div>

                    </section>


                    {/* ================================
              RECENT ACTIVITY
              ================================ */}

                    <section className="provider-section">

                        <div className="provider-section-header">

                            <div>

                                <span className="section-label">
                                    ACTIVITY
                                </span>

                                <h2>
                                    Recent Activity
                                </h2>

                            </div>

                        </div>


                        <div className="activity-card">

                            <div className="activity-icon">
                                ✓
                            </div>

                            <div>

                                <strong>
                                    Booking completed
                                </strong>

                                <p>
                                    Electrical Repair · Rahul
                                    Sharma
                                </p>

                            </div>

                            <span>
                                2 hours ago
                            </span>

                        </div>


                        <div className="activity-card">

                            <div className="activity-icon">
                                ⭐
                            </div>

                            <div>

                                <strong>
                                    New 5-star review
                                </strong>

                                <p>
                                    "Excellent service!"
                                </p>

                            </div>

                            <span>
                                Yesterday
                            </span>

                        </div>


                    </section>


                </main>

            </div>


            {/* Footer */}

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
                PROVIDER PROFILE MODAL
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
                                Provider Profile
                            </span>
                            <h3 style={{ margin: "4px 0 6px 0", color: "#362907", fontSize: "20px" }}>
                                {user?.isProfileBuilt ? "Edit Provider Profile" : "Build Provider Profile"}
                            </h3>
                            <p style={{ margin: 0, fontSize: "13px", color: "#7a6b47" }}>
                                Enter your contact details and service location to complete your profile.
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
                                    placeholder="Your provider / business name"
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
                                    Service City / Operating Address
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={profileAddress}
                                    onChange={(e) => setProfileAddress(e.target.value)}
                                    placeholder="Sector 14, Gurugram, Delhi NCR"
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

export default ProviderDashboard;