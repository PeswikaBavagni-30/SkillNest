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

    // Major Features Tabs: users, kyc, requests
    const [viewMode, setViewMode] = useState("users"); // "users" | "kyc" | "requests"
    const [verifications, setVerifications] = useState([]);
    const [verificationsLoading, setVerificationsLoading] = useState(false);
    const [customRequests, setCustomRequests] = useState([]);
    const [customRequestsLoading, setCustomRequestsLoading] = useState(false);

    // FEATURE 2: Admin Document Inspection & Audit
    const [selectedVerification, setSelectedVerification] = useState(null);
    const [viewingDocument, setViewingDocument] = useState(null);
    const [documentLoading, setDocumentLoading] = useState(false);
    const [rejectTarget, setRejectTarget] = useState(null);
    const [rejectReasonInput, setRejectReasonInput] = useState("Document is unclear or unreadable.");
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLogsLoading, setAuditLogsLoading] = useState(false);
    const [showAuditLogs, setShowAuditLogs] = useState(false);

    useEffect(() => {
        if (token) {
            fetchUsers();
            fetchVerifications();
            fetchCustomRequests();
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

    const fetchVerifications = async () => {
        setVerificationsLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/verification/all", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setVerifications(data.verifications || []);
            }
        } catch (err) {
            console.error("Error loading verifications:", err);
        } finally {
            setVerificationsLoading(false);
        }
    };

    const fetchCustomRequests = async () => {
        setCustomRequestsLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/service-requests", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCustomRequests(data.requests || []);
            }
        } catch (err) {
            console.error("Error loading custom requests:", err);
        } finally {
            setCustomRequestsLoading(false);
        }
    };

    const handleSetMockKyc = async (userId, targetStatus) => {
        setActionMessage("");
        setActionError("");
        try {
            const res = await fetch("http://localhost:5000/api/verification/mock-result", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ userId, status: targetStatus })
            });
            const data = await res.json();
            if (data.success) {
                setActionMessage(`Provider verification set to ${targetStatus}`);
                fetchVerifications();
                fetchUsers();
                setTimeout(() => setActionMessage(""), 3500);
            } else {
                setActionError(data.message || "Action failed.");
            }
        } catch (err) {
            setActionError("Network error updating verification.");
        }
    };

    // FEATURE 2: Open Provider Verification Details
    const handleOpenProviderDetails = (verification) => {
        setSelectedVerification(verification);
    };

    // FEATURE 2: Securely View Verification Document
    const handleViewDocument = async (verificationId, documentId, docMeta) => {
        setDocumentLoading(true);
        setActionError("");
        try {
            const res = await fetch(`http://localhost:5000/api/admin/verifications/${verificationId}/document/${documentId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) {
                throw new Error(`Failed to load document (Status ${res.status})`);
            }

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            setViewingDocument({
                ...docMeta,
                blobUrl,
                mimeType: docMeta.mime_type || blob.type
            });
        } catch (err) {
            console.error("handleViewDocument error:", err);
            setActionError(err.message || "Unable to securely load provider document.");
        } finally {
            setDocumentLoading(false);
        }
    };

    const handleCloseDocumentViewer = () => {
        if (viewingDocument?.blobUrl) {
            URL.revokeObjectURL(viewingDocument.blobUrl);
        }
        setViewingDocument(null);
    };

    // FEATURE 2: Admin Approve Verification
    const handleAdminApprove = async (verificationId) => {
        setActionMessage("");
        setActionError("");
        try {
            const res = await fetch(`http://localhost:5000/api/admin/verifications/${verificationId}/approve`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setActionMessage("✓ Provider identity verification approved successfully!");
                fetchVerifications();
                fetchUsers();
                if (selectedVerification?.id === verificationId) {
                    setSelectedVerification(null);
                }
                setTimeout(() => setActionMessage(""), 3500);
            } else {
                setActionError(data.message || "Failed to approve verification.");
            }
        } catch (err) {
            setActionError("Network error approving verification.");
        }
    };

    // FEATURE 2: Admin Reject Verification
    const handleAdminReject = async () => {
        if (!rejectTarget) return;
        setActionMessage("");
        setActionError("");
        try {
            const res = await fetch(`http://localhost:5000/api/admin/verifications/${rejectTarget.id}/reject`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ reason: rejectReasonInput.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setActionMessage("Provider identity verification rejected with notification sent.");
                fetchVerifications();
                fetchUsers();
                setRejectTarget(null);
                if (selectedVerification?.id === rejectTarget.id) {
                    setSelectedVerification(null);
                }
                setTimeout(() => setActionMessage(""), 3500);
            } else {
                setActionError(data.message || "Failed to reject verification.");
            }
        } catch (err) {
            setActionError("Network error rejecting verification.");
        }
    };

    // FEATURE 2: Fetch Document Audit Logs
    const handleOpenAuditLogs = async () => {
        setShowAuditLogs(true);
        setAuditLogsLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/admin/verifications/audit-logs", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setAuditLogs(data.logs || []);
            }
        } catch (err) {
            console.error("fetchAuditLogs error:", err);
        } finally {
            setAuditLogsLoading(false);
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

                {/* 3 MAJOR VIEW SWITCHER TABS */}
                <div style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "24px",
                    borderBottom: "2px solid #e9ecef",
                    paddingBottom: "12px",
                    flexWrap: "wrap"
                }}>
                    <button
                        onClick={() => setViewMode("users")}
                        style={{
                            padding: "10px 20px",
                            borderRadius: "10px",
                            border: "none",
                            background: viewMode === "users" ? "#24202b" : "#ffffff",
                            color: viewMode === "users" ? "#ffc107" : "#495057",
                            fontWeight: "800",
                            fontSize: "14px",
                            cursor: "pointer",
                            boxShadow: viewMode === "users" ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
                        }}
                    >
                        👥 Platform Users ({users.length})
                    </button>
                    <button
                        onClick={() => {
                            setViewMode("kyc");
                            fetchVerifications();
                        }}
                        style={{
                            padding: "10px 20px",
                            borderRadius: "10px",
                            border: "none",
                            background: viewMode === "kyc" ? "#24202b" : "#ffffff",
                            color: viewMode === "kyc" ? "#ffc107" : "#495057",
                            fontWeight: "800",
                            fontSize: "14px",
                            cursor: "pointer",
                            boxShadow: viewMode === "kyc" ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
                        }}
                    >
                        🛡️ Provider KYC Submissions ({verifications.length})
                    </button>
                    <button
                        onClick={() => {
                            setViewMode("requests");
                            fetchCustomRequests();
                        }}
                        style={{
                            padding: "10px 20px",
                            borderRadius: "10px",
                            border: "none",
                            background: viewMode === "requests" ? "#24202b" : "#ffffff",
                            color: viewMode === "requests" ? "#ffc107" : "#495057",
                            fontWeight: "800",
                            fontSize: "14px",
                            cursor: "pointer",
                            boxShadow: viewMode === "requests" ? "0 4px 12px rgba(0,0,0,0.15)" : "none"
                        }}
                    >
                        📋 Custom Service Requests & Proposals ({customRequests.length})
                    </button>
                </div>

                {/* VIEW 1: PLATFORM USERS */}
                {viewMode === "users" && (
                    <>
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

                                                    {/* Uploaded KYC Documents Display */}
                                                    {(() => {
                                                        const userVerif = verifications.find((v) => v.user_id === u.user_id);
                                                        const docs = userVerif?.documents || [];

                                                        if (docs.length > 0) {
                                                            return (
                                                                <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
                                                                    <span style={{ fontSize: "11px", fontWeight: "800", color: "#835b0a", textTransform: "uppercase" }}>
                                                                        Uploaded Document:
                                                                    </span>
                                                                    {docs.map((doc) => (
                                                                        <button
                                                                            key={doc.id}
                                                                            onClick={() => handleViewDocument(userVerif.id, doc.id, doc)}
                                                                            style={{
                                                                                display: "inline-flex",
                                                                                alignItems: "center",
                                                                                gap: "6px",
                                                                                padding: "5px 12px",
                                                                                borderRadius: "8px",
                                                                                border: "1px solid #ebd08d",
                                                                                background: "#fff9e6",
                                                                                color: "#835b0a",
                                                                                fontSize: "12px",
                                                                                fontWeight: "700",
                                                                                cursor: "pointer",
                                                                                boxShadow: "0 2px 6px rgba(131, 91, 10, 0.08)",
                                                                                transition: "all 0.2s ease"
                                                                            }}
                                                                            title="Click to securely inspect this verification document"
                                                                        >
                                                                            <span>📄 {doc.document_type || "ID Proof"}:</span>
                                                                            <span style={{ color: "#382d12", maxWidth: "200px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                                                                {doc.original_name}
                                                                            </span>
                                                                            <span style={{
                                                                                padding: "2px 6px",
                                                                                borderRadius: "4px",
                                                                                background: "#c98e1b",
                                                                                color: "#ffffff",
                                                                                fontSize: "11px",
                                                                                fontWeight: "800"
                                                                            }}>
                                                                                👁️ View
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            );
                                                        }

                                                        if (isPending) {
                                                            return (
                                                                <div style={{ marginTop: "8px", fontSize: "12px", color: "#b45309", display: "flex", alignItems: "center", gap: "5px" }}>
                                                                    <span>⚠️</span>
                                                                    <span>No verification document uploaded yet</span>
                                                                </div>
                                                            );
                                                        }

                                                        return null;
                                                    })()}
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
                    </>
                )}

                {/* VIEW 2: KYC IDENTITY VERIFICATIONS */}
                {viewMode === "kyc" && (
                    <div>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "18px",
                            marginBottom: "24px"
                        }}>
                            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>TOTAL KYC RECORDS</span>
                                <h2 style={{ margin: "6px 0 0 0", fontSize: "28px", color: "#1e293b" }}>{verifications.length}</h2>
                            </div>
                            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #86efac" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: "#16a34a" }}>VERIFIED PROVIDERS</span>
                                <h2 style={{ margin: "6px 0 0 0", fontSize: "28px", color: "#15803d" }}>
                                    {verifications.filter((v) => v.status === "VERIFIED").length}
                                </h2>
                            </div>
                            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #fde047" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: "#ca8a04" }}>PENDING VERIFICATION</span>
                                <h2 style={{ margin: "6px 0 0 0", fontSize: "28px", color: "#a16207" }}>
                                    {verifications.filter((v) => v.status === "PENDING").length}
                                </h2>
                            </div>
                            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #fca5a5" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: "#dc2626" }}>FAILED / REJECTED</span>
                                <h2 style={{ margin: "6px 0 0 0", fontSize: "28px", color: "#b91c1c" }}>
                                    {verifications.filter((v) => v.status === "FAILED").length}
                                </h2>
                            </div>
                        </div>

                        {/* Top action bar for KYC */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                            <span style={{ fontSize: "14px", fontWeight: "700", color: "#334155" }}>
                                Provider Identity Verifications & Sensitive Document Vault
                            </span>
                            <button
                                onClick={handleOpenAuditLogs}
                                style={{
                                    padding: "8px 16px",
                                    borderRadius: "8px",
                                    background: "#f1f5f9",
                                    border: "1px solid #cbd5e1",
                                    color: "#334155",
                                    fontSize: "12.5px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px"
                                }}
                            >
                                📜 View Document Access Audit Logs
                            </button>
                        </div>

                        {verificationsLoading ? (
                            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading KYC verifications...</div>
                        ) : verifications.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "50px 20px", background: "#ffffff", borderRadius: "14px", border: "1px dashed #cbd5e1" }}>
                                <span style={{ fontSize: "32px" }}>🛡️</span>
                                <h3 style={{ marginTop: "10px", color: "#334155" }}>No Verification Records Yet</h3>
                                <p style={{ color: "#64748b", fontSize: "13.5px" }}>Providers will appear here once they initiate their identity verification.</p>
                            </div>
                        ) : (
                            <div style={{ background: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                    <thead>
                                        <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0", fontSize: "12px", color: "#475569" }}>
                                            <th style={{ padding: "14px 18px" }}>PROVIDER</th>
                                            <th style={{ padding: "14px 18px" }}>LOCATION</th>
                                            <th style={{ padding: "14px 18px" }}>STATUS</th>
                                            <th style={{ padding: "14px 18px" }}>DOCUMENTS</th>
                                            <th style={{ padding: "14px 18px", textAlign: "right" }}>ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {verifications.map((v) => {
                                            const matchingUser = users.find((u) => u.user_id === v.user_id);
                                            const isVerified = v.status === "VERIFIED";
                                            const isPending = v.status === "PENDING";
                                            const isFailed = v.status === "FAILED";
                                            const docCount = v.documents ? v.documents.length : 0;
                                            const providerLocation = matchingUser?.address || "Kottayam, Kerala";

                                            return (
                                                <tr
                                                    key={v.id}
                                                    style={{ borderBottom: "1px solid #f1f5f9", fontSize: "13.5px", transition: "background 0.2s" }}
                                                >
                                                    <td style={{ padding: "14px 18px" }}>
                                                        <div style={{ fontWeight: "700", color: "#0f172a" }}>
                                                            {matchingUser ? matchingUser.full_name : `Provider (${v.user_id.substring(0, 8)}...)`}
                                                        </div>
                                                        <div style={{ fontSize: "11.5px", color: "#64748b" }}>
                                                            {matchingUser?.email}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "14px 18px", color: "#334155" }}>
                                                        📍 {providerLocation}
                                                    </td>
                                                    <td style={{ padding: "14px 18px" }}>
                                                        <span style={{
                                                            padding: "4px 10px",
                                                            borderRadius: "12px",
                                                            fontSize: "11px",
                                                            fontWeight: "800",
                                                            textTransform: "uppercase",
                                                            background: isVerified ? "#dcfce7" : isPending ? "#fef9c3" : "#fee2e2",
                                                            color: isVerified ? "#15803d" : isPending ? "#854d0e" : "#991b1b"
                                                        }}>
                                                            {v.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "14px 18px", color: "#64748b", fontSize: "12.5px" }}>
                                                        {docCount > 0 ? (
                                                            <span style={{ color: "#2563eb", fontWeight: "700" }}>
                                                                📄 {docCount} uploaded
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: "#94a3b8" }}>None attached</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "14px 18px", textAlign: "right" }}>
                                                        <button
                                                            onClick={() => handleOpenProviderDetails(v)}
                                                            style={{
                                                                padding: "7px 14px",
                                                                borderRadius: "8px",
                                                                background: "#24202b",
                                                                color: "#ffc107",
                                                                border: "none",
                                                                fontWeight: "700",
                                                                fontSize: "12px",
                                                                cursor: "pointer"
                                                            }}
                                                        >
                                                            🔍 View Details
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}


                {/* VIEW 3: CUSTOM SERVICE REQUESTS & PROPOSALS */}
                {viewMode === "requests" && (
                    <div>
                        <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "18px",
                            marginBottom: "24px"
                        }}>
                            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: "#64748b" }}>TOTAL CUSTOM REQUESTS</span>
                                <h2 style={{ margin: "6px 0 0 0", fontSize: "28px", color: "#1e293b" }}>{customRequests.length}</h2>
                            </div>
                            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #93c5fd" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: "#2563eb" }}>OPEN FOR QUOTES</span>
                                <h2 style={{ margin: "6px 0 0 0", fontSize: "28px", color: "#1d4ed8" }}>
                                    {customRequests.filter((r) => r.status === "open").length}
                                </h2>
                            </div>
                            <div style={{ background: "#ffffff", padding: "20px", borderRadius: "14px", border: "1px solid #86efac" }}>
                                <span style={{ fontSize: "12px", fontWeight: "700", color: "#16a34a" }}>ACCEPTED & BOOKED</span>
                                <h2 style={{ margin: "6px 0 0 0", fontSize: "28px", color: "#15803d" }}>
                                    {customRequests.filter((r) => r.status === "accepted").length}
                                </h2>
                            </div>
                        </div>

                        {customRequestsLoading ? (
                            <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>Loading custom requests...</div>
                        ) : customRequests.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "50px 20px", background: "#ffffff", borderRadius: "14px", border: "1px dashed #cbd5e1" }}>
                                <span style={{ fontSize: "32px" }}>📋</span>
                                <h3 style={{ marginTop: "10px", color: "#334155" }}>No Custom Requests Yet</h3>
                                <p style={{ color: "#64748b", fontSize: "13.5px" }}>Customer custom requirements will appear here once posted.</p>
                            </div>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                {customRequests.map((req) => (
                                    <div
                                        key={req.id}
                                        style={{
                                            background: "#ffffff",
                                            borderRadius: "14px",
                                            padding: "20px",
                                            border: "1px solid #e2e8f0",
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
                                                <p style={{ margin: "4px 0 10px 0", color: "#475569", fontSize: "13.5px" }}>
                                                    {req.description}
                                                </p>
                                                <div style={{ display: "flex", gap: "14px", fontSize: "12.5px", color: "#64748b", flexWrap: "wrap" }}>
                                                    <span>👤 <strong>Customer:</strong> {req.customer_name} ({req.customer_email})</span>
                                                    <span>🏷️ <strong>Category:</strong> {req.category_name || "General"}</span>
                                                    <span>💰 <strong>Budget:</strong> {req.budget_max ? `Up to ₹${req.budget_max}` : "Flexible"}</span>
                                                    {req.preferred_date && <span>📅 <strong>Date:</strong> {req.preferred_date}</span>}
                                                    <span>⏰ <strong>Posted:</strong> {new Date(req.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Proposals submitted by providers */}
                                        <div style={{ marginTop: "14px", borderTop: "1px dashed #e2e8f0", paddingTop: "12px" }}>
                                            <span style={{ fontSize: "13px", fontWeight: "700", color: "#334155" }}>
                                                Provider Proposals ({req.responses ? req.responses.length : 0})
                                            </span>
                                            {(!req.responses || req.responses.length === 0) ? (
                                                <p style={{ margin: "6px 0 0 0", fontSize: "12px", color: "#94a3b8", fontStyle: "italic" }}>
                                                    No quotes submitted by providers yet.
                                                </p>
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
                                                    {req.responses.map((resp) => {
                                                        const isSelected = req.accepted_response_id === resp.id || resp.status === "accepted";
                                                        return (
                                                            <div
                                                                key={resp.id}
                                                                style={{
                                                                    padding: "10px 14px",
                                                                    borderRadius: "8px",
                                                                    background: isSelected ? "#f0fdf4" : "#f8fafc",
                                                                    border: isSelected ? "1px solid #86efac" : "1px solid #e2e8f0",
                                                                    display: "flex",
                                                                    justifyContent: "space-between",
                                                                    alignItems: "center",
                                                                    flexWrap: "wrap",
                                                                    gap: "10px"
                                                                }}
                                                            >
                                                                <div>
                                                                    <strong style={{ color: "#1e293b", fontSize: "13px" }}>
                                                                        {resp.provider_name}
                                                                    </strong>
                                                                    <span style={{ marginLeft: "8px", fontWeight: "800", color: "#c98e1b" }}>
                                                                        ₹{resp.quote_price}
                                                                    </span>
                                                                    {resp.turnaround_days && (
                                                                        <span style={{ marginLeft: "8px", fontSize: "11px", color: "#64748b" }}>
                                                                            ({resp.turnaround_days} days)
                                                                        </span>
                                                                    )}
                                                                    {isSelected && (
                                                                        <span style={{ marginLeft: "8px", fontSize: "11px", color: "#15803d", fontWeight: "700", background: "#dcfce7", padding: "2px 6px", borderRadius: "4px" }}>
                                                                            ✓ BOOKED
                                                                        </span>
                                                                    )}
                                                                    <p style={{ margin: "3px 0 0 0", fontSize: "12px", color: "#475569" }}>
                                                                        "{resp.proposal_message}"
                                                                    </p>
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
                    </div>
                )}
            </main>

            {/* FEATURE 2: PROVIDER DETAILS MODAL */}
            {selectedVerification && (() => {
                const provUser = users.find((u) => u.user_id === selectedVerification.user_id);
                const docs = selectedVerification.documents || [];
                const isVerified = selectedVerification.status === "VERIFIED";
                const isPending = selectedVerification.status === "PENDING";
                const isFailed = selectedVerification.status === "FAILED";

                return (
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100vw",
                            height: "100vh",
                            background: "rgba(15, 23, 42, 0.65)",
                            backdropFilter: "blur(5px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 10000,
                            padding: "20px"
                        }}
                        onClick={() => setSelectedVerification(null)}
                    >
                        <div
                            style={{
                                background: "#ffffff",
                                borderRadius: "20px",
                                maxWidth: "580px",
                                width: "100%",
                                maxHeight: "88vh",
                                overflowY: "auto",
                                padding: "28px",
                                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
                                position: "relative"
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: "19px", color: "#0f172a" }}>
                                        Provider Verification Details
                                    </h2>
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>Admin Review & Document Inspection</span>
                                </div>
                                <button
                                    onClick={() => setSelectedVerification(null)}
                                    style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontWeight: "700" }}
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Provider Info Card */}
                            <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "16px", marginBottom: "18px", border: "1px solid #e2e8f0" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                                    <div>
                                        <span style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Provider Name</span>
                                        <div style={{ fontWeight: "700", color: "#0f172a" }}>{provUser?.full_name || "Provider"}</div>
                                    </div>
                                    <div>
                                        <span style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Location</span>
                                        <div style={{ fontWeight: "700", color: "#0f172a" }}>📍 {provUser?.address || "Kottayam, Kerala"}</div>
                                    </div>
                                    <div>
                                        <span style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Email</span>
                                        <div style={{ color: "#334155" }}>{provUser?.email}</div>
                                    </div>
                                    <div>
                                        <span style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Phone</span>
                                        <div style={{ color: "#334155" }}>{provUser?.phone || "On file"}</div>
                                    </div>
                                    <div>
                                        <span style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Submitted Date</span>
                                        <div style={{ color: "#334155" }}>{new Date(selectedVerification.created_at).toLocaleDateString()}</div>
                                    </div>
                                    <div>
                                        <span style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase", fontWeight: "700" }}>Verification Ref</span>
                                        <div style={{ color: "#334155", fontSize: "11.5px" }}><code>{selectedVerification.verification_reference}</code></div>
                                    </div>
                                </div>

                                <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #cbd5e1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontSize: "12px", color: "#64748b" }}>Current Status:</span>
                                    <span style={{
                                        padding: "3px 10px",
                                        borderRadius: "12px",
                                        fontSize: "11px",
                                        fontWeight: "800",
                                        background: isVerified ? "#dcfce7" : isPending ? "#fef9c3" : "#fee2e2",
                                        color: isVerified ? "#15803d" : isPending ? "#854d0e" : "#991b1b"
                                    }}>
                                        {selectedVerification.status}
                                    </span>
                                </div>
                            </div>

                            {/* Documents Inspection Section */}
                            <div style={{ marginBottom: "20px" }}>
                                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#0f172a", marginBottom: "10px" }}>
                                    📑 Verification Documents
                                </h3>

                                {docs.length === 0 ? (
                                    <div style={{ padding: "16px", background: "#f8fafc", borderRadius: "10px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                                        No identity documents uploaded yet for this provider.
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {docs.map((doc) => (
                                            <div
                                                key={doc.id}
                                                style={{
                                                    padding: "12px 16px",
                                                    borderRadius: "10px",
                                                    background: "#ffffff",
                                                    border: "1px solid #e2e8f0",
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    alignItems: "center"
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: "700", fontSize: "13.5px", color: "#1e293b" }}>
                                                        📄 {doc.document_type || "Government ID"}
                                                    </div>
                                                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                                                        {doc.original_name} • {(doc.file_size / 1024).toFixed(0)} KB
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleViewDocument(selectedVerification.id, doc.id, doc)}
                                                    disabled={documentLoading}
                                                    style={{
                                                        padding: "7px 14px",
                                                        borderRadius: "8px",
                                                        background: "#2563eb",
                                                        color: "#ffffff",
                                                        border: "none",
                                                        fontSize: "12px",
                                                        fontWeight: "700",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "4px"
                                                    }}
                                                >
                                                    👁️ View Document
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Admin Decision Actions */}
                            <div style={{ display: "flex", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "16px" }}>
                                {!isVerified && (
                                    <button
                                        onClick={() => handleAdminApprove(selectedVerification.id)}
                                        style={{
                                            flex: 1,
                                            padding: "12px",
                                            borderRadius: "10px",
                                            background: "linear-gradient(135deg, #16a34a, #15803d)",
                                            color: "#ffffff",
                                            border: "none",
                                            fontWeight: "700",
                                            fontSize: "13px",
                                            cursor: "pointer"
                                        }}
                                    >
                                        ✓ Approve Verification
                                    </button>
                                )}
                                {!isFailed && (
                                    <button
                                        onClick={() => setRejectTarget(selectedVerification)}
                                        style={{
                                            flex: 1,
                                            padding: "12px",
                                            borderRadius: "10px",
                                            background: "#fee2e2",
                                            color: "#dc2626",
                                            border: "1px solid #fca5a5",
                                            fontWeight: "700",
                                            fontSize: "13px",
                                            cursor: "pointer"
                                        }}
                                    >
                                        ✕ Reject Verification
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* FEATURE 2: SECURE DOCUMENT VIEWER MODAL */}
            {viewingDocument && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "rgba(15, 23, 42, 0.85)",
                        backdropFilter: "blur(6px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 11000,
                        padding: "20px"
                    }}
                    onClick={handleCloseDocumentViewer}
                >
                    <div
                        style={{
                            background: "#ffffff",
                            borderRadius: "16px",
                            maxWidth: "800px",
                            width: "100%",
                            maxHeight: "90vh",
                            display: "flex",
                            flexDirection: "column",
                            overflow: "hidden",
                            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>
                                    🔒 Secure Document Inspection: {viewingDocument.document_type || "Verification Document"}
                                </h3>
                                <span style={{ fontSize: "12px", color: "#64748b" }}>
                                    {viewingDocument.original_name} • Audit Log Entry Created
                                </span>
                            </div>
                            <button
                                onClick={handleCloseDocumentViewer}
                                style={{
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                    background: "#e2e8f0",
                                    border: "none",
                                    fontWeight: "700",
                                    fontSize: "12px",
                                    cursor: "pointer"
                                }}
                            >
                                Close
                            </button>
                        </div>

                        {/* Content Viewer */}
                        <div style={{ padding: "20px", flex: 1, display: "flex", justifyContent: "center", alignItems: "center", background: "#0f172a", overflow: "auto" }}>
                            {viewingDocument.mimeType?.includes("pdf") ? (
                                <iframe
                                    src={viewingDocument.blobUrl}
                                    title="Document Viewer"
                                    style={{ width: "100%", height: "65vh", border: "none", borderRadius: "8px", background: "#ffffff" }}
                                />
                            ) : (
                                <img
                                    src={viewingDocument.blobUrl}
                                    alt="Verification Document"
                                    style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: "8px" }}
                                />
                            )}
                        </div>

                        {/* Footer with Close */}
                        <div style={{ padding: "14px 20px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                                Confidential: Do not capture or distribute sensitive government documents.
                            </span>
                            <button
                                onClick={handleCloseDocumentViewer}
                                style={{
                                    padding: "8px 20px",
                                    background: "#24202b",
                                    color: "#ffc107",
                                    border: "none",
                                    borderRadius: "8px",
                                    fontWeight: "700",
                                    cursor: "pointer"
                                }}
                            >
                                [Close]
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FEATURE 2: REJECT REASON MODAL */}
            {rejectTarget && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "rgba(15, 23, 42, 0.65)",
                        backdropFilter: "blur(4px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 12000,
                        padding: "20px"
                    }}
                    onClick={() => setRejectTarget(null)}
                >
                    <div
                        style={{
                            background: "#ffffff",
                            borderRadius: "16px",
                            maxWidth: "460px",
                            width: "100%",
                            padding: "24px",
                            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.3)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ margin: "0 0 8px 0", fontSize: "17px", color: "#0f172a" }}>
                            Reject Provider Verification
                        </h3>
                        <p style={{ margin: "0 0 14px 0", fontSize: "12.5px", color: "#64748b" }}>
                            The provider will be notified immediately with the rejection reason so they can re-upload valid documents.
                        </p>

                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                                Reason for Rejection:
                            </label>
                            <textarea
                                value={rejectReasonInput}
                                onChange={(e) => setRejectReasonInput(e.target.value)}
                                rows={3}
                                style={{
                                    width: "100%",
                                    padding: "10px",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "13px",
                                    outline: "none",
                                    boxSizing: "border-box"
                                }}
                                placeholder="e.g. Document image is blurry or expired."
                            />
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                            <button
                                onClick={() => setRejectTarget(null)}
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    borderRadius: "8px",
                                    background: "#f1f5f9",
                                    border: "none",
                                    fontWeight: "700",
                                    cursor: "pointer"
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAdminReject}
                                style={{
                                    flex: 1,
                                    padding: "10px",
                                    borderRadius: "8px",
                                    background: "#dc2626",
                                    color: "#ffffff",
                                    border: "none",
                                    fontWeight: "700",
                                    cursor: "pointer"
                                }}
                            >
                                [Reject]
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FEATURE 2: DOCUMENT AUDIT LOGS MODAL */}
            {showAuditLogs && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        background: "rgba(15, 23, 42, 0.65)",
                        backdropFilter: "blur(5px)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10000,
                        padding: "20px"
                    }}
                    onClick={() => setShowAuditLogs(false)}
                >
                    <div
                        style={{
                            background: "#ffffff",
                            borderRadius: "18px",
                            maxWidth: "700px",
                            width: "100%",
                            maxHeight: "85vh",
                            overflowY: "auto",
                            padding: "26px",
                            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
                                    📜 Document Access Audit Trail
                                </h3>
                                <span style={{ fontSize: "12px", color: "#64748b" }}>
                                    Timestamped record of all administrator inspections of sensitive documents
                                </span>
                            </div>
                            <button
                                onClick={() => setShowAuditLogs(false)}
                                style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontWeight: "700" }}
                            >
                                ✕
                            </button>
                        </div>

                        {auditLogsLoading ? (
                            <div style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>Loading audit records...</div>
                        ) : auditLogs.length === 0 ? (
                            <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
                                No document inspection events recorded yet.
                            </div>
                        ) : (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
                                <thead>
                                    <tr style={{ borderBottom: "2px solid #e2e8f0", textAlign: "left", color: "#475569" }}>
                                        <th style={{ padding: "10px" }}>TIME</th>
                                        <th style={{ padding: "10px" }}>ACTION</th>
                                        <th style={{ padding: "10px" }}>ADMIN ID</th>
                                        <th style={{ padding: "10px" }}>DOCUMENT ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map((log) => (
                                        <tr key={log.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "10px", color: "#64748b" }}>
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td style={{ padding: "10px" }}>
                                                <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "4px", fontWeight: "700", fontSize: "11px" }}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td style={{ padding: "10px", fontFamily: "monospace", color: "#334155" }}>
                                                {log.admin_id?.substring(0, 8)}...
                                            </td>
                                            <td style={{ padding: "10px", fontFamily: "monospace", color: "#334155" }}>
                                                {log.document_id?.substring(0, 12)}...
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        <div style={{ marginTop: "20px", textAlign: "right" }}>
                            <button
                                onClick={() => setShowAuditLogs(false)}
                                style={{
                                    padding: "8px 18px",
                                    borderRadius: "8px",
                                    background: "#24202b",
                                    color: "#ffc107",
                                    border: "none",
                                    fontWeight: "700",
                                    cursor: "pointer"
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;

