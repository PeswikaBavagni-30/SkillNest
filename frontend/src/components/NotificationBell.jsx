import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function NotificationBell() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch("http://localhost:5000/api/notifications", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 15 seconds for real-time feel
    const interval = setInterval(fetchNotifications, 15000);
    window.addEventListener("skillnest_refresh_notifications", fetchNotifications);
    return () => {
      clearInterval(interval);
      window.removeEventListener("skillnest_refresh_notifications", fetchNotifications);
    };
  }, [token]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error marking notification read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/notifications/read-all", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Error marking all read:", err);
    }
  };

  // Icon helper based on notification content
  const getIcon = (title) => {
    const t = (title || "").toLowerCase();
    if (t.includes("payment")) return "💳";
    if (t.includes("booking") && t.includes("request")) return "📅";
    if (t.includes("accepted")) return "✅";
    if (t.includes("completed")) return "🎉";
    return "🔔";
  };

  // Format relative timestamp
  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="notification-button"
        title="Notifications"
        style={{
          position: "relative",
          cursor: "pointer",
          border: "none",
          background: "none",
          fontSize: "20px"
        }}
        id="notification-bell-btn"
      >
        🔔
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-2px",
              right: "-4px",
              background: "#e53e3e",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "800",
              minWidth: "18px",
              height: "18px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              border: "2px solid #ffffff",
              boxShadow: "0 2px 5px rgba(229,62,62,0.4)"
            }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "45px",
            right: "0",
            width: "360px",
            maxWidth: "90vw",
            background: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.15), 0 2px 6px rgba(201,142,27,0.1)",
            border: "1px solid #ebd08d",
            zIndex: 1000,
            overflow: "hidden",
            animation: "fadeIn 0.2s ease"
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              background: "#fffaf0",
              borderBottom: "1px solid #ebd08d"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <strong style={{ color: "#382d12", fontSize: "15px" }}>Notifications</strong>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: "#c98e1b",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "2px 8px",
                    borderRadius: "10px"
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "#835b0a",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "6px"
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "30px 20px", textAlign: "center", color: "#8a7536" }}>
                <span style={{ fontSize: "28px", display: "block", marginBottom: "8px" }}>🔕</span>
                <p style={{ margin: 0, fontSize: "14px" }}>No notifications yet</p>
                <span style={{ fontSize: "12px", color: "#a8997a" }}>
                  Updates on bookings and payments will appear here
                </span>
              </div>
            ) : (
              notifications.slice(0, 6).map((n) => (
                <div
                  key={n.notification_id}
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    background: n.is_read ? "#ffffff" : "#fffdf5",
                    borderBottom: "1px solid #f6ecce",
                    transition: "background 0.2s"
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: n.is_read ? "#f4f1ea" : "#fff2d6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                      flexShrink: 0
                    }}
                  >
                    {getIcon(n.title)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <h4
                        style={{
                          margin: "0 0 2px 0",
                          fontSize: "13px",
                          fontWeight: n.is_read ? "600" : "800",
                          color: "#24202b"
                        }}
                      >
                        {n.title}
                      </h4>
                      <span style={{ fontSize: "11px", color: "#9c8e76", flexShrink: 0 }}>
                        {formatTime(n.created_at)}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#5c5346",
                        lineHeight: "1.4"
                      }}
                    >
                      {n.message}
                    </p>
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(n.notification_id, e)}
                      title="Mark as read"
                      style={{
                        background: "none",
                        border: "none",
                        color: "#c98e1b",
                        cursor: "pointer",
                        fontSize: "14px",
                        padding: "2px 4px",
                        lineHeight: 1
                      }}
                    >
                      ●
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "10px",
              textAlign: "center",
              background: "#fffaf0",
              borderTop: "1px solid #ebd08d"
            }}
          >
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: "13px",
                fontWeight: "700",
                color: "#835b0a",
                textDecoration: "none"
              }}
            >
              View All Notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
