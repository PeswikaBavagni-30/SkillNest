const express = require("express");
const router = express.Router();
const {
  getProviderPortfolio,
  addPortfolioItem,
  setPrimaryItem,
  deletePortfolioItem
} = require("./portfolio.controller");
const { authenticateToken, requireRole } = require("../../middleware/authMiddleware");
const { handleImageUpload } = require("../../middleware/uploadMiddleware");

// GET /api/portfolio/:providerId or /api/portfolio/provider/:providerId - Public
router.get("/:providerId", getProviderPortfolio);
router.get("/provider/:providerId", getProviderPortfolio);

// POST /api/portfolio - Provider only (file or JSON)
router.post(
  "/",
  authenticateToken,
  requireRole(["PROVIDER", "ADMIN"]),
  handleImageUpload("image"),
  addPortfolioItem
);

// PUT or PATCH /api/portfolio/:id/primary - Provider only
router.put(
  "/:id/primary",
  authenticateToken,
  requireRole(["PROVIDER", "ADMIN"]),
  setPrimaryItem
);
router.patch(
  "/:id/primary",
  authenticateToken,
  requireRole(["PROVIDER", "ADMIN"]),
  setPrimaryItem
);

// DELETE /api/portfolio/:id - Provider only
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["PROVIDER", "ADMIN"]),
  deletePortfolioItem
);

module.exports = router;
