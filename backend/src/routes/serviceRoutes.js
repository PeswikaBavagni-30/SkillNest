const express = require("express");
const router = express.Router();
const {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  uploadServiceImage,
  uploadServiceImageForId,
  deleteServiceImage
} = require("../controllers/serviceController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");
const { handleImageUpload } = require("../middleware/uploadMiddleware");

// GET /api/services - Public: List services with filters (category_id, search, provider_id)
router.get("/", getServices);

// GET /api/services/:id - Public: Get single service details
router.get("/:id", getServiceById);

// POST /api/services/upload-image - Standalone image upload for draft service creation
router.post(
  "/upload-image",
  authenticateToken,
  requireRole(["PROVIDER", "ADMIN"]),
  handleImageUpload("image"),
  uploadServiceImage
);

// POST /api/services/:id/image - Upload/replace image for existing service
router.post(
  "/:id/image",
  authenticateToken,
  requireRole(["PROVIDER", "ADMIN"]),
  handleImageUpload("image"),
  uploadServiceImageForId
);

// DELETE /api/services/:id/image - Remove image from existing service
router.delete(
  "/:id/image",
  authenticateToken,
  requireRole(["PROVIDER", "ADMIN"]),
  deleteServiceImage
);

// POST /api/services - Protected: Add service (Providers only)
router.post("/", authenticateToken, requireRole(["PROVIDER", "ADMIN"]), createService);

// PUT /api/services/:id - Protected: Edit service (Provider ownership enforced)
router.put("/:id", authenticateToken, requireRole(["PROVIDER", "ADMIN"]), updateService);

// DELETE /api/services/:id - Protected: Delete service (Provider ownership enforced)
router.delete("/:id", authenticateToken, requireRole(["PROVIDER", "ADMIN"]), deleteService);

module.exports = router;
