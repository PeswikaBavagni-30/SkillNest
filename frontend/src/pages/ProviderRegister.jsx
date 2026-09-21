import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordValidator, { isPasswordValid } from "../components/PasswordValidator";
import "../App.css";

function ProviderRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    profession: "",
    experience: "",
    idType: "",
    idNumber: ""
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    const fieldMap = {
      "provider-name": "name",
      "provider-email": "email",
      "provider-password": "password",
      "provider-confirm-password": "confirmPassword",
      "profession": "profession",
      "experience": "experience",
      "document-type": "idType",
      "document-number": "idNumber"
    };

    const key = fieldMap[id] || id;
    setFormData((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const {
      name,
      email,
      password,
      confirmPassword,
      profession,
      experience,
      idType,
      idNumber
    } = formData;

    // Field validation (Requirements 1 & 2)
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all required account fields.");
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

    if (!profession.trim()) {
      setError("Please specify your profession or main skill.");
      return;
    }

    if (!idType || !idNumber.trim()) {
      setError("Please select an ID type and enter your ID number.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/auth/register/provider", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          profession: profession.trim(),
          experience: experience ? `${experience} years` : undefined,
          idType,
          idNumber: idNumber.trim()
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "Provider registration failed. Please try again.");
      } else {
        setSuccess(
          data.message ||
          "Registration submitted! Your provider account is pending verification. Redirecting to login..."
        );
        setTimeout(() => {
          navigate("/login");
        }, 2500);
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


      {/* Provider Registration Card */}

      <div className="login-box provider-box">

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


        {/* Heading */}

        <h2>Become a Provider</h2>

        <p className="subtitle">
          Create your provider account and get verified
        </p>


        {/* Account Details */}

        <div className="section-title">
          Account Details
        </div>


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

            <label htmlFor="provider-name">
              Full Name
            </label>

            <div className="input-container">

              <span className="input-icon">
                👤
              </span>

              <input
                id="provider-name"
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

            <label htmlFor="provider-email">
              Email
            </label>

            <div className="input-container">

              <span className="input-icon">
                ✉
              </span>

              <input
                id="provider-email"
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

            <label htmlFor="provider-password">
              Password
            </label>

            <div className="input-container">

              <span className="input-icon">
                🔒
              </span>

              <input
                id="provider-password"
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

            <label htmlFor="provider-confirm-password">
              Confirm Password
            </label>

            <div className="input-container">

              <span className="input-icon">
                🔒
              </span>

              <input
                id="provider-confirm-password"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />

            </div>

          </div>


          {/* Provider Details */}

          <div className="section-title">
            Provider Details
          </div>


          {/* Profession */}

          <div className="form-group">

            <label htmlFor="profession">
              Profession / Skill
            </label>

            <div className="input-container">

              <span className="input-icon">
                🛠
              </span>

              <input
                id="profession"
                type="text"
                placeholder="Example: Electrician"
                value={formData.profession}
                onChange={handleChange}
                disabled={loading}
              />

            </div>

          </div>


          {/* Experience */}

          <div className="form-group">

            <label htmlFor="experience">
              Experience
            </label>

            <div className="input-container">

              <span className="input-icon">
                ⭐
              </span>

              <input
                id="experience"
                type="number"
                min="0"
                placeholder="Years of experience"
                value={formData.experience}
                onChange={handleChange}
                disabled={loading}
              />

            </div>

          </div>


          {/* Verification */}

          <div className="section-title">
            Identity Verification
          </div>


          {/* Document Type */}

          <div className="form-group">

            <label htmlFor="document-type">
              Government ID Type
            </label>

            <select
              id="document-type"
              className="select-input"
              value={formData.idType}
              onChange={handleChange}
              disabled={loading}
            >

              <option value="" disabled>
                Select document type
              </option>

              <option value="aadhaar">
                Aadhaar
              </option>

              <option value="pan">
                PAN
              </option>

              <option value="passport">
                Passport
              </option>

              <option value="driving-license">
                Driving Licence
              </option>

              <option value="voter-id">
                Voter ID
              </option>

            </select>

          </div>


          {/* Document Number */}

          <div className="form-group">

            <label htmlFor="document-number">
              Government ID Number
            </label>

            <div className="input-container">

              <span className="input-icon">
                🪪
              </span>

              <input
                id="document-number"
                type="text"
                placeholder="Enter ID number"
                value={formData.idNumber}
                onChange={handleChange}
                disabled={loading}
              />

            </div>

          </div>


          {/* Document Upload */}

          <div className="form-group">

            <label htmlFor="government-proof">
              Upload Government Proof
            </label>

            <input
              id="government-proof"
              type="file"
              className="file-input"
              accept=".jpg,.jpeg,.png,.pdf"
              disabled={loading}
            />

            <p className="file-note">
              Accepted formats: JPG, PNG or PDF
            </p>

          </div>


          {/* Verification Notice */}

          <div className="verification-notice">

            <span>🔐</span>

            <p>
              Your provider account will remain
              pending until your identity is verified
              by SkillNest.
            </p>

          </div>


          {/* Submit */}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >

            <span>
              {loading ? "Submitting Application..." : "Submit for Verification"}
            </span>

            <span className="arrow">
              →
            </span>

          </button>

        </form>


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

export default ProviderRegister;