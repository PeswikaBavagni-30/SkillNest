import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import PasswordValidator, { isPasswordValid } from "../components/PasswordValidator";
import "../App.css";

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Extract access token from URL hash or query parameters
  useEffect(() => {
    // Check hash (Supabase default: #access_token=...&type=recovery)
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const token = params.get("access_token");
      if (token) {
        setAccessToken(token);
        return;
      }
    }

    // Check query params (?token=... or ?access_token=...)
    const searchParams = new URLSearchParams(location.search);
    const queryToken = searchParams.get("token") || searchParams.get("access_token");
    if (queryToken) {
      setAccessToken(queryToken);
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isPasswordValid(password)) {
      setError("Your new password must meet all 5 security requirements below.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!accessToken) {
      setError("Recovery token not found or link has expired. Please request a new recovery link.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password,
          accessToken
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Failed to update password. Please try again.");
      } else {
        setSuccess("Password updated successfully! Redirecting to login...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (err) {
      setError("Unable to connect to SkillNest server. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* Decorative bubbles */}
      <div className="bubble bubble-one"></div>
      <div className="bubble bubble-two"></div>
      <div className="bubble bubble-three"></div>
      <div className="gold-ring ring-one"></div>
      <div className="gold-ring ring-two"></div>

      <div className="login-box">
        <div className="card-decoration top-decoration"></div>
        <div className="card-decoration bottom-decoration"></div>

        {/* Brand */}
        <div className="brand">
          <div className="leaf-logo">
            <span className="leaf leaf-left"></span>
            <span className="leaf leaf-middle"></span>
            <span className="leaf leaf-right"></span>
          </div>
          <h1>SkillNest</h1>
        </div>

        <h2>Set New Password</h2>
        <p className="subtitle">
          Create a secure new password for your SkillNest account.
        </p>

        {/* Feedback Messages */}
        {error && (
          <div className="auth-alert auth-alert-error">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="auth-alert auth-alert-success">
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* New Password */}
          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <div className="input-container">
              <span className="input-icon">🔒</span>
              <input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <span
                className="password-eye"
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: "pointer", userSelect: "none" }}
              >
                {showPassword ? "🙈" : "◉"}
              </span>
            </div>
            <PasswordValidator password={password} />
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label htmlFor="confirm-new-password">Confirm New Password</label>
            <div className="input-container">
              <span className="input-icon">🔒</span>
              <input
                id="confirm-new-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
            style={{ marginTop: "14px" }}
          >
            <span>{loading ? "Updating password..." : "Update Password"}</span>
            <span className="arrow">→</span>
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <Link
            to="/login"
            style={{
              color: "#9c7606",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "14px"
            }}
          >
            ← Back to Login
          </Link>
        </div>

      </div>

    </div>
  );
}

export default ResetPassword;
