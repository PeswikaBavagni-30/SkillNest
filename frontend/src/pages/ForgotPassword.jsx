import { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim()) {
      setError("Please enter your registered email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email format (e.g. name@example.com).");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Unable to send recovery link. Please try again.");
      } else {
        setSuccess(data.message);
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

        <h2>Forgot Password?</h2>
        <p className="subtitle">
          Enter your registered email and we'll send you a secure link to reset your password.
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

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="recovery-email">
              Registered Email
            </label>
            <div className="input-container">
              <span className="input-icon">✉</span>
              <input
                id="recovery-email"
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={loading}
            style={{ marginTop: "16px" }}
          >
            <span>{loading ? "Sending link..." : "Send Recovery Link"}</span>
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

export default ForgotPassword;
