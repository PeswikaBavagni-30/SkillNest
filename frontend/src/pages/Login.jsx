import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../App.css";

function Login() {
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Invalid email or password.");
      } else {
        // Store authenticated session via AuthContext
        loginUser(data.user, data.session?.access_token || "");

        setSuccess(`Welcome back, ${data.user.name || "User"}!`);

        // Role-based redirection:
        // CUSTOMER -> /dashboard
        // PROVIDER -> /provider-dashboard
        setTimeout(() => {
          if (data.user.role === "PROVIDER") {
            navigate("/provider-dashboard");
          } else {
            navigate("/dashboard");
          }
        }, 1200);
      }
    } catch (err) {
      setError("Unable to connect to SkillNest server. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* Background decorations */}

      <div className="gold-circle circle-one"></div>
      <div className="gold-circle circle-two"></div>
      <div className="gold-circle circle-three"></div>

      <div className="small-bubble bubble-one"></div>
      <div className="small-bubble bubble-two"></div>
      <div className="small-bubble bubble-three"></div>
      <div className="small-bubble bubble-four"></div>

      <div className="gold-ring ring-one"></div>
      <div className="gold-ring ring-two"></div>


      {/* Login Card */}

      <div className="login-box">

        <div className="card-decoration top-decoration"></div>
        <div className="card-decoration bottom-decoration"></div>


        {/* Logo */}

        <div className="brand">

          <div className="leaf-logo">

            <span className="leaf leaf-left"></span>
            <span className="leaf leaf-middle"></span>
            <span className="leaf leaf-right"></span>

          </div>

          <h1>SkillNest</h1>

        </div>


        {/* Welcome */}

        <h2>Welcome back!</h2>

        <p className="subtitle">
          Log in to continue your journey with SkillNest
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

        {/* Login Form */}

        <form onSubmit={handleSubmit}>

          {/* Email */}

          <div className="form-group">

            <label htmlFor="email">
              Email
            </label>

            <div className="input-container">

              <span className="input-icon">
                ✉
              </span>

              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />

            </div>

          </div>


          {/* Password */}

          <div className="form-group">

            <label htmlFor="password">
              Password
            </label>

            <div className="input-container">

              <span className="input-icon">
                🔒
              </span>

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />

              <span
                className="password-eye"
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: "pointer", userSelect: "none" }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "🙈" : "◉"}
              </span>

            </div>

          </div>


          {/* Forgot password */}

          <div className="forgot-password">

            <Link
              to="/forgot-password"
              style={{
                color: "#9c7606",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "13px"
              }}
            >
              Forgot password?
            </Link>

          </div>


          {/* Login button */}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >

            <span>
              {loading ? "Logging in..." : "Login"}
            </span>

            <span className="arrow">
              →
            </span>

          </button>

        </form>


        {/* OR */}

        <div className="divider">

          <div></div>

          <span>OR</span>

          <div></div>

        </div>


        {/* Register navigation */}

        <p className="register-text">

          Don't have an account?

          <Link
            to="/register"
            className="register-link"
          >
            Register →
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

export default Login;