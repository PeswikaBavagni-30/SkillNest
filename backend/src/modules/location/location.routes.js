const express = require("express");
const router = express.Router();
const {
  getUserLocation,
  updateUserLocation,
  getProviderServiceAreas,
  addProviderServiceArea,
  deleteProviderServiceArea,
  checkProviderCoverage,
  getPublicProviderLocation
} = require("./location.controller");
const { authenticateToken } = require("../../middleware/authMiddleware");

// Public routes
router.get("/check", checkProviderCoverage);
router.get("/provider/:providerId", getPublicProviderLocation);

// Authenticated routes
router.use(authenticateToken);
router.get("/user", getUserLocation);
router.put("/user", updateUserLocation);

// Provider service area routes
router.get("/service-areas", getProviderServiceAreas);
router.post("/service-areas", addProviderServiceArea);
router.delete("/service-areas/:id", deleteProviderServiceArea);

module.exports = router;
