import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

export default function NotificationsPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState("all"); // "all" | "unread" | "read"
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchNotifications();
  }, [token]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
        );
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/notifications/read-all", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setActionMessage("All notifications marked as read!");
        setTimeout(() => setActionMessage(""), 3000);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filterTab === "unread") return !n.is_read;
    if (filterTab === "read") return n.is_read;
    return true;
  });

  const getIcon = (title) => {
    const t = (title || "").toLowerCase();
    if (t.includes("payment")) return "💳";
    if (t.includes("booking") && t.includes("request")) return "📅";
    if (t.includes("accepted")) return "✅";
    if (t.includes("completed")) return "🎉";
    return "🔔";
  };

  const backUrl = user?.role === "PROVIDER" ? "/provider-dashboard" : "/dashboard";

  return (
    <div className="dashboard-page" style={{ minHeight: "100vh" }}>
      {/* NAVBAR */}
      <header className="dashboard-navbar">
        <Link to={backUrl} className="dashboard-logo">
          <div className="mini-leaf-logo">
            <span></span><span></span><span></span>
          </div>
          <span>SkillNest Notifications</span>
        </Link>

        <div className="dashboard-navbar-right">
          <Link
            to={backUrl}
            style={{
              padding: "8px 16px",
              background: "#fff6de",
              border: "1px solid #ebd08d",
              borderRadius: "10px",
              color: "#835b0a",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "13px"
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: "800px", margin: "40px auto", padding: "0 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h1 style={{ fontSize: "24px", color: "#24202b", margin: "0 0 4px 0" }}>Notifications Hub</h1>
            <p style={{ margin: 0, fontSize: "14px", color: "#7a6b47" }}>
              Stay updated on booking lifecycle events and payment transactions
            </p>
          </div>

          {notifications.some((n) => !n.is_read) && (
            <button
              onClick={handleMarkAllRead}
              style={{
                padding: "8px 16px",
                background: "#c98e1b",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              ✓ Mark All Read
            </button>
          )}
        </div>

        {actionMessage && (
          <div
            style={{
              background: "#e1faea",
              border: "1px solid #b7ebd0",
              color: "#107c39",
              padding: "10px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "600",
              marginBottom: "16px"
            }}
          >
            ✓ {actionMessage}
          </div>
        )}

        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          {[
            { id: "all", label: `All (${notifications.length})` },
            { id: "unread", label: `Unread (${notifications.filter((n) => !n.is_read).length})` },
            { id: "read", label: `Read (${notifications.filter((n) => n.is_read).length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              style={{
                padding: "8px 16px",
                borderRadius: "20px",
                border: filterTab === tab.id ? "2px solid #c98e1b" : "1px solid #ebd08d",
                background: filterTab === tab.id ? "#c98e1b" : "#ffffff",
                color: filterTab === tab.id ? "#ffffff" : "#68501e",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#835b0a" }}>
            Loading notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              border: "1px dashed #ebd08d",
              padding: "40px",
              textAlign: "center"
            }}
          >
            <span style={{ fontSize: "36px" }}>🔕</span>
            <h3 style={{ marginTop: "12px", color: "#382d12" }}>No {filterTab} notifications</h3>
            <p style={{ color: "#7a6b47", fontSize: "14px" }}>
              When booking status changes or payments are made, alerts will show here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {filtered.map((n) => (
              <div
                key={n.notification_id}
                style={{
                  background: n.is_read ? "#ffffff" : "#fffcf2",
                  borderRadius: "16px",
                  padding: "18px 20px",
                  border: n.is_read ? "1px solid #f1e0a8" : "2px solid #ebd08d",
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "16px",
                  boxShadow: "0 2px 8px rgba(201,142,27,0.05)"
                }}
              >
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "12px",
                      background: n.is_read ? "#f4f1ea" : "#fff2d6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "22px",
                      flexShrink: 0
                    }}
                  >
                    {getIcon(n.title)}
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <h3 style={{ margin: 0, fontSize: "15px", color: "#24202b" }}>{n.title}</h3>
                      {!n.is_read && (
                        <span
                          style={{
                            background: "#c98e1b",
                            color: "#ffffff",
                            fontSize: "10px",
                            fontWeight: "800",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            textTransform: "uppercase"
                          }}
                        >
                          New
                        </span>
                      )}
                    </div>

                    <p style={{ margin: "6px 0 8px 0", fontSize: "13px", color: "#5c5346", lineHeight: "1.4" }}>
                      {n.message}
                    </p>

                    <span style={{ fontSize: "11px", color: "#9c8e76" }}>
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(n.notification_id)}
                    style={{
                      padding: "6px 12px",
                      background: "#fff6de",
                      border: "1px solid #ebd08d",
                      borderRadius: "8px",
                      color: "#835b0a",
                      fontSize: "12px",
                      fontWeight: "700",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
