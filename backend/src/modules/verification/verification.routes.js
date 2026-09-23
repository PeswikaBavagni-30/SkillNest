const express = require("express");
const router = express.Router();
const {
  startVerification,
  getVerificationStatus,
  uploadDocument,
  processMockResult,
  getAllVerifications,
  adminGetVerificationDetails,
  adminViewDocument,
  adminApproveVerification,
  adminRejectVerification,
  adminGetAuditLogs
} = require("./verification.controller");
const { authenticateToken, requireRole } = require("../../middleware/authMiddleware");
const { handleDocumentUpload } = require("./documentUpload.middleware");

// All verification endpoints require authentication
router.use(authenticateToken);

// Provider verification routes
router.post("/start", startVerification);
router.get("/status", getVerificationStatus);
router.post("/upload-document", handleDocumentUpload("document"), uploadDocument);

// Development mock result simulation
router.post("/mock-result", processMockResult);

// Admin overview & verification management
router.get("/all", requireRole(["ADMIN"]), getAllVerifications);
router.get("/audit-logs", requireRole(["ADMIN"]), adminGetAuditLogs);
router.get("/:verificationId", requireRole(["ADMIN"]), adminGetVerificationDetails);
router.get("/:verificationId/document/:documentId", requireRole(["ADMIN"]), adminViewDocument);
router.put("/:verificationId/approve", requireRole(["ADMIN"]), adminApproveVerification);
router.put("/:verificationId/reject", requireRole(["ADMIN"]), adminRejectVerification);

module.exports = router;
