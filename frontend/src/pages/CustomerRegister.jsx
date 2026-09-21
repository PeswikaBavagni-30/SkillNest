import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordValidator, { isPasswordValid } from "../components/PasswordValidator";
import "../App.css";

function CustomerRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    // Map customer-specific field IDs to state keys
    const fieldMap = {
      "customer-name": "name",
      "customer-email": "email",
      "customer-password": "password",
      "customer-confirm-password": "confirmPassword"
    };

    setFormData((prev) => ({
      ...prev,
      [fieldMap[id] || id]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const { name, email, password, confirmPassword } = formData;

    // Client-side validation (Requirements 1 & 2)
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email format (e.g. name@example.com).");
      return;
    }

    if (!isPasswordValid(password)) {
      setError("Password must meet all 5 security requirements below.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register/customer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Registration failed. Please try again.");
      } else {
        setSuccess(data.message || "Registration successful! Redirecting to login...");
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

      {/* Background */}

      <div className="gold-circle circle-one"></div>
      <div className="gold-circle circle-two"></div>
      <div className="gold-circle circle-three"></div>

      <div className="small-bubble bubble-one"></div>
      <div className="small-bubble bubble-two"></div>
      <div className="small-bubble bubble-three"></div>
      <div className="small-bubble bubble-four"></div>

      <div className="gold-ring ring-one"></div>
      <div className="gold-ring ring-two"></div>


      {/* Registration Card */}

      <div className="login-box registration-box">

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


        <h2>Create Customer Account</h2>

        <p className="subtitle">
          Find trusted services on SkillNest
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

          {/* Full Name */}

          <div className="form-group">

            <label htmlFor="customer-name">
              Full Name
            </label>

            <div className="input-container">

              <span className="input-icon">
                👤
              </span>

              <input
                id="customer-name"
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />

            </div>

          </div>


          {/* Email */}

          <div className="form-group">

            <label htmlFor="customer-email">
              Email
            </label>

            <div className="input-container">

              <span className="input-icon">
                ✉
              </span>

              <input
                id="customer-email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />

            </div>

          </div>


          {/* Password */}

          <div className="form-group">

            <label htmlFor="customer-password">
              Password
            </label>

            <div className="input-container">

              <span className="input-icon">
                🔒
              </span>

              <input
                id="customer-password"
                type="password"
                placeholder="Create a password (min 8 chars, A-Z, a-z, 0-9, special)"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />

            </div>

            <PasswordValidator password={formData.password} />

          </div>


          {/* Confirm Password */}

          <div className="form-group">

            <label htmlFor="customer-confirm-password">
              Confirm Password
            </label>

            <div className="input-container">

              <span className="input-icon">
                🔒
              </span>

              <input
                id="customer-confirm-password"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />

            </div>

          </div>


          {/* Create Account */}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            <span>{loading ? "Creating Account..." : "Create Account"}</span>
            <span className="arrow">→</span>
          </button>

        </form>


        {/* Switch to provider */}

        <p className="switch-role">

          Want to offer services?

          <Link
            to="/register/provider"
            className="register-link"
          >
            Become a Provider
          </Link>

        </p>


        {/* Login */}

        <p className="register-text">

          Already have an account?

          <Link
            to="/login"
            className="register-link"
          >
            Login →
          </Link>

        </p>


        {/* Footer */}

        <div className="bottom-section">

          <div className="three-dots">

            <span></span>
            <span></span>
            <span></span>

          </div>

          <p>
            LEARN&nbsp;&nbsp;•&nbsp;&nbsp;OFFER&nbsp;&nbsp;•&nbsp;&nbsp;GROW
          </p>

        </div>

      </div>

    </div>
  );
}

export default CustomerRegister;