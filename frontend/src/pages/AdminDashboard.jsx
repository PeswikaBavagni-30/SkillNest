import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

function AdminDashboard() {
    const navigate = useNavigate();
    const { user, token, logoutUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterTab, setFilterTab] = useState("pending-providers"); // "pending-providers" | "verified-providers" | "customers" | "all"
    const [searchQuery, setSearchQuery] = useState("");
    const [actionMessage, setActionMessage] = useState("");
    const [actionError, setActionError] = useState("");

    useEffect(() => {
        if (token) {
            fetchUsers();
        }
    }, [token]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/users", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setUsers(data.users || []);
            }
        } catch (err) {
            console.error("Error loading users:", err);
            setActionError("Failed to fetch users from server.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyProvider = async (userId, approve = true) => {
        setActionMessage("");
        setActionError("");
        try {
            const res = await fetch(`http://localhost:5000/api/users/${userId}/verify`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ is_verified: approve })
            });

            const data = await res.json();
            if (data.success) {
                setActionMessage(data.message || (approve ? "Provider verified!" : "Verification revoked."));
                fetchUsers();
                setTimeout(() => setActionMessage(""), 3500);
            } else {
                setActionError(data.message || "Action failed.");
            }
        } catch (err) {
            console.error("Verify provider error:", err);
            setActionError("Network error while updating provider status.");
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to permanently delete this user account?")) return;

        try {
            const res = await fetch(`http://localhost:5000/api/users/${userId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setActionMessage("User deleted successfully.");
                fetchUsers();
                setTimeout(() => setActionMessage(""), 3000);
            } else {
                setActionError(data.message || "Failed to delete user.");
            }
        } catch (err) {
            setActionError("Error deleting user.");
        }
    };

    const handleLogout = () => {
        logoutUser();
        navigate("/login");
    };

    // Filter calculations
    const pendingProviders = users.filter((u) => u.role === "provider" && !u.is_verified);
    const verifiedProviders = users.filter((u) => u.role === "provider" && u.is_verified);
    const customers = users.filter((u) => u.role === "customer");

    const displayedUsers = users.filter((u) => {
        // Tab filter
        if (filterTab === "pending-providers" && (u.role !== "provider" || u.is_verified)) return false;
        if (filterTab === "verified-providers" && (u.role !== "provider" || !u.is_verified)) return false;
        if (filterTab === "customers" && u.role !== "customer") return false;

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const name = (u.full_name || "").toLowerCase();
            const email = (u.email || "").toLowerCase();
            const phone = (u.phone || "").toLowerCase();
            return name.includes(q) || email.includes(q) || phone.includes(q);
        }
        return true;
    });

    return (
        <div className="dashboard-page" style={{ background: "#f8f9fa", minHeight: "100vh" }}>

            {/* ADMIN NAVBAR */}
            <header className="dashboard-navbar" style={{ background: "#24202b", color: "#ffffff", borderBottom: "1px solid #3d3548" }}>
                <Link to="/admin-dashboard" className="dashboard-logo">
                    <div className="mini-leaf-logo">
                        <span style={{ background: "#ffc107" }}></span>
                        <span style={{ background: "#ffc107" }}></span>
                        <span style={{ background: "#ffc107" }}></span>
                    </div>
                    <span style={{ color: "#ffffff" }}>SkillNest Admin Portal</span>
                </Link>

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{
                        background: "#3d3548",
                        padding: "6px 14px",
                        borderRadius: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "13px"
                    }}>
                        <span style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#28a745",
                            display: "inline-block"
                        }}></span>
                        <strong style={{ color: "#ffc107" }}>SUPER ADMIN</strong>
                        <span>({user?.email || "admin@skillnest.com"})</span>
                    </div>

                    <button
                        onClick={handleLogout}
                        style={{
                            padding: "8px 16px",
                            background: "#dc3545",
                            border: "none",
                            borderRadius: "8px",
                            color: "#ffffff",
                            fontWeight: "700",
                            fontSize: "13px",
                            cursor: "pointer"
                        }}
                    >
                        Sign out
                    </button>
                </div>
            </header>

            {/* MAIN CONTENT */}
            <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "30px 20px" }}>

                {/* HEADER ROW */}
                <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                    <div>
                        <span style={{ fontSize: "12px", fontWeight: "800", color: "#c98e1b", textTransform: "uppercase", letterSpacing: "1px" }}>
                            CONTROL CENTER & VERIFICATION HUB
                        </span>
                        <h1 style={{ margin: "4px 0 0 0", color: "#24202b", fontSize: "28px" }}>
                            Provider & User Management
                        </h1>
                    </div>

                    <button
                        onClick={fetchUsers}
                        style={{
                            padding: "10px 18px",
                            background: "#ffffff",
                            border: "1px solid #ebd08d",
                            borderRadius: "10px",
                            color: "#835b0a",
                            fontWeight: "700",
                            cursor: "pointer"
                        }}
                    >
                        ↻ Refresh Data
                    </button>
                </div>

                {/* NOTIFICATIONS */}
                {actionMessage && (
                    <div style={{
                        padding: "12px 20px",
                        background: "#e1faea",
                        border: "1px solid #a3e9be",
                        borderRadius: "10px",
                        color: "#107c39",
                        fontWeight: "700",
                        marginBottom: "20px"
                    }}>
                        ✓ {actionMessage}
                    </div>
                )}

                {actionError && (
                    <div style={{
                        padding: "12px 20px",
                        background: "#ffebeb",
                        border: "1px solid #ffcccc",
                        borderRadius: "10px",
                        color: "#c41c1c",
                        fontWeight: "700",
                        marginBottom: "20px"
                    }}>
                        ✕ {actionError}
                    </div>
                )}

                {/* STATS CARDS */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "18px",
                    marginBottom: "30px"
                }}>
                    <div style={{
                        background: "#ffffff",
                        padding: "20px",
                        borderRadius: "16px",
                        border: pendingProviders.length > 0 ? "2px solid #e4a62b" : "1px solid #ebd08d",
                        boxShadow: "0 4px 15px rgba(0,0,0,0.04)"
                    }}>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#8a7536", textTransform: "uppercase" }}>
                            Pending Verifications
                        </span>
                        <h2 style={{ margin: "8px 0", fontSize: "32px", color: pendingProviders.length > 0 ? "#c98e1b" : "#24202b" }}>
                            {pendingProviders.length}
                        </h2>
                        <span style={{ fontSize: "12px", color: pendingProviders.length > 0 ? "#e4a62b" : "#6c757d", fontWeight: "700" }}>
                            {pendingProviders.length > 0 ? "⚠️ Requires admin review" : "All providers verified"}
                        </span>
                    </div>

                    <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #ebd08d", boxShadow: "0 4px 15px rgba(0,0,0,0.04)" }}>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#8a7536", textTransform: "uppercase" }}>
                            Verified Providers
                        </span>
                        <h2 style={{ margin: "8px 0", fontSize: "32px", color: "#107c39" }}>
                            {verifiedProviders.length}
                        </h2>
                        <span style={{ fontSize: "12px", color: "#6c757d" }}>Active service professionals</span>
                    </div>

                    <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #ebd08d", boxShadow: "0 4px 15px rgba(0,0,0,0.04)" }}>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#8a7536", textTransform: "uppercase" }}>
                            Total Customers
                        </span>
                        <h2 style={{ margin: "8px 0", fontSize: "32px", color: "#24202b" }}>
                            {customers.length}
                        </h2>
                        <span style={{ fontSize: "12px", color: "#6c757d" }}>Registered service seekers</span>
                    </div>

                    <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #ebd08d", boxShadow: "0 4px 15px rgba(0,0,0,0.04)" }}>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#8a7536", textTransform: "uppercase" }}>
                            Total Platform Users
                        </span>
                        <h2 style={{ margin: "8px 0", fontSize: "32px", color: "#24202b" }}>
                            {users.length}
                        </h2>
                        <span style={{ fontSize: "12px", color: "#6c757d" }}>Across all accounts</span>
                    </div>
                </div>

                {/* TABS & SEARCH */}
                <div style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    padding: "20px",
                    border: "1px solid #ebd08d",
                    marginBottom: "24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "16px"
                }}>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                        <button
                            onClick={() => setFilterTab("pending-providers")}
                            style={{
                                padding: "9px 18px",
                                borderRadius: "20px",
                                border: filterTab === "pending-providers" ? "2px solid #c98e1b" : "1px solid #ebd08d",
                                background: filterTab === "pending-providers" ? "#c98e1b" : "#ffffff",
                                color: filterTab === "pending-providers" ? "#ffffff" : "#68501e",
                                fontWeight: "800",
                                fontSize: "13px",
                                cursor: "pointer"
                            }}
                        >
                            Pending Applications ({pendingProviders.length})
                        </button>

                        <button
                            onClick={() => setFilterTab("verified-providers")}
                            style={{
                                padding: "9px 18px",
                                borderRadius: "20px",
                                border: filterTab === "verified-providers" ? "2px solid #c98e1b" : "1px solid #ebd08d",
                                background: filterTab === "verified-providers" ? "#c98e1b" : "#ffffff",
                                color: filterTab === "verified-providers" ? "#ffffff" : "#68501e",
                                fontWeight: "800",
                                fontSize: "13px",
                                cursor: "pointer"
                            }}
                        >
                            Verified Providers ({verifiedProviders.length})
                        </button>

                        <button
                            onClick={() => setFilterTab("customers")}
                            style={{
                                padding: "9px 18px",
                                borderRadius: "20px",
                                border: filterTab === "customers" ? "2px solid #c98e1b" : "1px solid #ebd08d",
                                background: filterTab === "customers" ? "#c98e1b" : "#ffffff",
                                color: filterTab === "customers" ? "#ffffff" : "#68501e",
                                fontWeight: "800",
                                fontSize: "13px",
                                cursor: "pointer"
                            }}
                        >
                            Customers ({customers.length})
                        </button>

                        <button
                            onClick={() => setFilterTab("all")}
                            style={{
                                padding: "9px 18px",
                                borderRadius: "20px",
                                border: filterTab === "all" ? "2px solid #c98e1b" : "1px solid #ebd08d",
                                background: filterTab === "all" ? "#c98e1b" : "#ffffff",
                                color: filterTab === "all" ? "#ffffff" : "#68501e",
                                fontWeight: "800",
                                fontSize: "13px",
                                cursor: "pointer"
                            }}
                        >
                            All Users ({users.length})
                        </button>
                    </div>

                    <div style={{ position: "relative", minWidth: "260px" }}>
                        <input
                            type="text"
                            placeholder="Search by name, email, phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "10px 14px",
                                borderRadius: "10px",
                                border: "1px solid #ebd08d",
                                fontSize: "13px",
                                outline: "none"
                            }}
                        />
                    </div>
                </div>

                {/* USER / PROVIDER LIST */}
                {loading ? (
                    <div style={{ textAlign: "center", padding: "50px 0", color: "#8a7536" }}>
                        Loading SkillNest database records...
                    </div>
                ) : displayedUsers.length === 0 ? (
                    <div style={{
                        textAlign: "center",
                        padding: "50px 20px",
                        background: "#ffffff",
                        borderRadius: "16px",
                        border: "1px dashed #ebd08d"
                    }}>
                        <span style={{ fontSize: "36px" }}>🔍</span>
                        <h3 style={{ marginTop: "12px", color: "#382d12" }}>No users found</h3>
                        <p style={{ color: "#7a6b47", fontSize: "14px" }}>
                            {filterTab === "pending-providers"
                                ? "All provider applications have been reviewed and approved!"
                                : "No records match your selected filter."}
                        </p>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                        {displayedUsers.map((u) => {
                            const isProvider = u.role === "provider";
                            const isPending = isProvider && !u.is_verified;

                            return (
                                <div
                                    key={u.user_id}
                                    style={{
                                        background: "#ffffff",
                                        borderRadius: "16px",
                                        padding: "20px",
                                        border: isPending ? "2px solid #e4a62b" : "1px solid #f1e0a8",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        flexWrap: "wrap",
                                        gap: "16px",
                                        boxShadow: "0 4px 15px rgba(0,0,0,0.03)"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                        <div style={{
                                            width: "50px",
                                            height: "50px",
                                            borderRadius: "14px",
                                            background: isPending ? "#fff4cc" : "#f1f3f5",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "22px",
                                            fontWeight: "800",
                                            color: "#835b0a"
                                        }}>
                                            {u.full_name ? u.full_name.charAt(0).toUpperCase() : "U"}
                                        </div>

                                        <div>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                <h3 style={{ margin: 0, fontSize: "17px", color: "#24202b" }}>
                                                    {u.full_name || "Unnamed User"}
                                                </h3>
                                                <span style={{
                                                    padding: "2px 8px",
                                                    borderRadius: "12px",
                                                    fontSize: "11px",
                                                    fontWeight: "800",
                                                    textTransform: "uppercase",
                                                    background:
                                                        u.role === "admin" ? "#24202b" :
                                                        u.role === "provider" ? "#e6f4ea" : "#e8f0fe",
                                                    color:
                                                        u.role === "admin" ? "#ffc107" :
                                                        u.role === "provider" ? "#137333" : "#1a73e8"
                                                }}>
                                                    {u.role}
                                                </span>

                                                {isProvider && (
                                                    <span style={{
                                                        padding: "2px 8px",
                                                        borderRadius: "12px",
                                                        fontSize: "11px",
                                                        fontWeight: "800",
                                                        textTransform: "uppercase",
                                                        background: u.is_verified ? "#e1faea" : "#fff4cc",
                                                        color: u.is_verified ? "#107c39" : "#916a00"
                                                    }}>
                                                        {u.is_verified ? "✓ Verified" : "⏳ Pending Review"}
                                                    </span>
                                                )}
                                            </div>

                                            <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#6c757d" }}>
                                                ✉️ {u.email} {u.phone ? `· 📞 ${u.phone}` : ""}
                                            </p>
                                            {u.address && (
                                                <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#8a7536" }}>
                                                    📍 {u.address}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* ACTIONS */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        {isProvider && !u.is_verified && (
                                            <button
                                                onClick={() => handleVerifyProvider(u.user_id, true)}
                                                style={{
                                                    padding: "9px 18px",
                                                    background: "linear-gradient(135deg, #28a745, #1e7e34)",
                                                    color: "#ffffff",
                                                    border: "none",
                                                    borderRadius: "10px",
                                                    fontWeight: "700",
                                                    fontSize: "13px",
                                                    cursor: "pointer",
                                                    boxShadow: "0 4px 10px rgba(40,167,69,0.25)"
                                                }}
                                            >
                                                ✓ Verify & Approve Provider
                                            </button>
                                        )}

                                        {isProvider && u.is_verified && (
                                            <button
                                                onClick={() => handleVerifyProvider(u.user_id, false)}
                                                style={{
                                                    padding: "8px 14px",
                                                    background: "#fff2f2",
                                                    color: "#dc3545",
                                                    border: "1px solid #ffcccc",
                                                    borderRadius: "8px",
                                                    fontWeight: "600",
                                                    fontSize: "12px",
                                                    cursor: "pointer"
                                                }}
                                            >
                                                Revoke Verification
                                            </button>
                                        )}

                                        {u.role !== "admin" && (
                                            <button
                                                onClick={() => handleDeleteUser(u.user_id)}
                                                style={{
                                                    padding: "8px 12px",
                                                    background: "#f8f9fa",
                                                    color: "#dc3545",
                                                    border: "1px solid #e9ecef",
                                                    borderRadius: "8px",
                                                    fontSize: "13px",
                                                    cursor: "pointer"
                                                }}
                                                title="Delete User"
                                            >
                                                🗑
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}

export default AdminDashboard;
