const express = require("express");
const router = express.Router();
const {
  registerCustomer,
  registerProvider,
  login,
  forgotPassword,
  resetPassword,
  updateProfile,
  getMe
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

// Customer Registration route (Requirement 1, 2)
router.post("/register/customer", registerCustomer);

// Provider Registration route (Requirement 1, 2, 11)
router.post("/register/provider", registerProvider);

// Login route (Requirement 3, 5)
router.post("/login", login);

// Forgot Password recovery initiation (Requirement 9)
router.post("/forgot-password", forgotPassword);

// Reset Password with recovery token (Requirement 9)
router.post("/reset-password", resetPassword);

// Profile update route - Protected by backend authentication middleware (Requirement 7)
router.put("/profile", authenticateToken, updateProfile);

// Current user profile verification route (Requirement 4, 12)
router.get("/me", getMe);

module.exports = router;
