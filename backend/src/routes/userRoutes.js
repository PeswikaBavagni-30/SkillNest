const express = require("express");
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  verifyProvider,
  deleteUser
} = require("../controllers/userController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

// GET /api/users/profile - Protected: Current authenticated profile
router.get("/profile", authenticateToken, getUserProfile);

// PUT /api/users/profile - Protected: Update authenticated profile
router.put("/profile", authenticateToken, updateUserProfile);

// GET /api/users - Admin: List all registered users
router.get("/", authenticateToken, requireRole(["ADMIN"]), getAllUsers);

// PUT /api/users/:id/verify - Admin: Verify / Approve or Revoke Provider
router.put("/:id/verify", authenticateToken, requireRole(["ADMIN"]), verifyProvider);

// DELETE /api/users/:id - Admin: Delete user
router.delete("/:id", authenticateToken, requireRole(["ADMIN"]), deleteUser);

module.exports = router;
