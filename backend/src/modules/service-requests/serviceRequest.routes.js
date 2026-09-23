const express = require("express");
const router = express.Router();
const {
  createServiceRequest,
  getServiceRequests,
  getServiceRequestById,
  updateServiceRequest,
  deleteServiceRequest,
  addRequestResponse,
  getRequestResponses,
  acceptRequestQuote
} = require("./serviceRequest.controller");
const { authenticateToken, requireRole } = require("../../middleware/authMiddleware");

// All custom service request routes require authentication
router.use(authenticateToken);

// GET /api/service-requests - List requests (Customer sees their own, Provider sees open marketplace)
router.get("/", getServiceRequests);

// POST /api/service-requests - Create a custom request (Customer or Admin)
router.post("/", requireRole(["CUSTOMER", "ADMIN"]), createServiceRequest);

// GET /api/service-requests/:id - Single request details
router.get("/:id", getServiceRequestById);

// PUT /api/service-requests/:id - Update custom request
router.put("/:id", updateServiceRequest);

// DELETE /api/service-requests/:id - Cancel/delete custom request
router.delete("/:id", deleteServiceRequest);

// POST /api/service-requests/:id/responses - Provider submits quote/proposal
router.post("/:id/responses", requireRole(["PROVIDER", "ADMIN"]), addRequestResponse);

// GET /api/service-requests/:id/responses - View quotes for this request
router.get("/:id/responses", getRequestResponses);

// POST /api/service-requests/:id/accept - Customer accepts a quote
router.post("/:id/accept", requireRole(["CUSTOMER", "ADMIN"]), acceptRequestQuote);

module.exports = router;
