import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute Component (Requirements 5, 6, 12)
 * 1. Shows a graceful loading placeholder during session re-verification.
 * 2. Redirects unauthenticated visitors to /login.
 * 3. Enforces authoritative role-based access.
 */
export default function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  // Non-blocking loading placeholder during initial session verification
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fffaf0",
        fontFamily: "'Outfit', sans-serif"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "42px",
            height: "42px",
            border: "4px solid #f1e0a8",
            borderTop: "4px solid #c98e1b",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px auto"
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <p style={{ color: "#7a6b47", fontSize: "14px", fontWeight: "600" }}>
            Verifying SkillNest session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    if (user.role === "PROVIDER") {
      return <Navigate to="/provider-dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
