const fs = require("fs");
const path = require("path");
const verificationService = require("./verification.service");
const auditService = require("./audit.service");
const supabase = require("../../config/supabase");

/**
 * Start Verification Session
 * POST /api/verification/start
 */
const startVerification = async (req, res) => {
  try {
    const userId = req.user.id;
    const session = await verificationService.startVerification(userId);

    return res.status(201).json({
      success: true,
      message: "Identity verification initiated successfully.",
      provider: session.provider,
      verification_reference: session.verification_reference,
      status: session.status,
      instructions: [
        "1. Upload a valid Government ID (Aadhaar, Voter ID, Passport, or Driving License).",
        "2. Upload optional additional verification document if requested.",
        "3. Wait for automated or administrator verification confirmation."
      ]
    });
  } catch (err) {
    console.error("startVerification error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate identity verification.",
      error: err.message
    });
  }
};

/**
 * Get Current Verification Status
 * GET /api/verification/status
 */
const getVerificationStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const status = await verificationService.getStatus(userId);

    return res.json({
      success: true,
      data: status
    });
  } catch (err) {
    console.error("getVerificationStatus error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch verification status.",
      error: err.message
    });
  }
};

/**
 * Provider Uploads Verification Document
 * POST /api/verification/upload-document
 * Multipart: field "document", body: document_type ("Government ID" | "Additional document")
 */
const uploadDocument = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No document file provided."
      });
    }

    const documentType = req.body.document_type || "Government ID";
    const result = await verificationService.attachDocument({
      userId,
      documentType,
      file: req.file
    });

    return res.status(201).json({
      success: true,
      message: `${documentType} uploaded securely.`,
      document: result.document
    });
  } catch (err) {
    console.error("uploadDocument error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to upload document.",
      error: err.message
    });
  }
};

/**
 * Mock KYC Provider Result Callback (DEVELOPMENT ONLY)
 * POST /api/verification/mock-result
 * Body: { status: 'VERIFIED' | 'FAILED', reason?: string }
 */
const processMockResult = async (req, res) => {
  try {
    const targetUserId = (req.user.role === "ADMIN" && req.body.userId) ? req.body.userId : req.user.id;
    const { status, reason } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required ('VERIFIED' or 'FAILED')."
      });
    }

    const record = await verificationService.processMockResult({
      userId: targetUserId,
      status,
      reason
    });

    return res.json({
      success: true,
      notice: "DEVELOPMENT MOCK RESULT APPLIED",
      message: `Verification outcome set to ${record.status}`,
      record
    });
  } catch (err) {
    console.error("processMockResult error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to process mock result."
    });
  }
};

/**
 * Admin: List All Verifications
 * GET /api/verification/all or GET /api/admin/verifications
 */
const getAllVerifications = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin access required."
      });
    }

    const verifications = await verificationService.getAllVerifications();
    return res.json({
      success: true,
      count: verifications.length,
      verifications
    });
  } catch (err) {
    console.error("getAllVerifications error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load verifications.",
      error: err.message
    });
  }
};

/**
 * Admin: View Single Verification Details
 * GET /api/admin/verifications/:verificationId
 */
const adminGetVerificationDetails = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin access required."
      });
    }

    const { verificationId } = req.params;
    const verification = await verificationService.getVerificationById(verificationId);

    if (!verification) {
      return res.status(404).json({
        success: false,
        message: "Verification record not found."
      });
    }

    // Fetch provider user details from Supabase
    let userDetails = null;
    try {
      const { data: user } = await supabase
        .from("users")
        .select("user_id, full_name, email, phone, address, is_verified")
        .eq("user_id", verification.user_id)
        .single();
      userDetails = user;
    } catch (e) {
      console.warn("Could not fetch user details for verification:", e.message);
    }

    return res.json({
      success: true,
      verification,
      provider: userDetails
    });
  } catch (err) {
    console.error("adminGetVerificationDetails error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch verification details.",
      error: err.message
    });
  }
};

/**
 * Admin: Securely View Document
 * GET /api/admin/verifications/:verificationId/document/:documentId
 * Strictly restricted to authenticated Administrators!
 */
const adminViewDocument = async (req, res) => {
  try {
    // 1. Verify admin authorization
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Document viewing is restricted to authorized administrators."
      });
    }

    const { verificationId, documentId } = req.params;

    // 2. Find document in verification record
    const docInfo = await verificationService.getDocument({ verificationId, documentId });
    if (!docInfo || !docInfo.document) {
      return res.status(404).json({
        success: false,
        message: "Document not found."
      });
    }

    let filePath = docInfo.document.storage_path;
    if (filePath && !path.isAbsolute(filePath)) {
      filePath = path.resolve(__dirname, "../../../", filePath);
    }
    if (!filePath || !fs.existsSync(filePath)) {
      const fallback = path.resolve(PRIVATE_DOCS_DIR, docInfo.document.filename || "");
      if (fs.existsSync(fallback)) {
        filePath = fallback;
      } else {
        return res.status(404).json({
          success: false,
          message: "Document file not found on secure storage."
        });
      }
    }

    // 3. Record audit event (ADMIN_DOCUMENT_VIEWED)
    await auditService.logDocumentView({
      adminId: req.user.id,
      providerId: docInfo.verification.user_id,
      documentId: docInfo.document.id,
      action: "ADMIN_DOCUMENT_VIEWED"
    });

    // 4. Stream file securely to the administrator
    const mimeType = docInfo.document.mime_type || "application/octet-stream";
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${docInfo.document.original_name}"`);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");

    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);
  } catch (err) {
    console.error("adminViewDocument error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to securely open document.",
      error: err.message
    });
  }
};

/**
 * Admin: Approve Provider Verification
 * PUT /api/admin/verifications/:verificationId/approve
 */
const adminApproveVerification = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin authorization required."
      });
    }

    const { verificationId } = req.params;
    const record = await verificationService.approveVerification({
      verificationId,
      adminId: req.user.id
    });

    return res.json({
      success: true,
      message: "Provider identity verification approved successfully.",
      record
    });
  } catch (err) {
    console.error("adminApproveVerification error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to approve verification."
    });
  }
};

/**
 * Admin: Reject Provider Verification
 * PUT /api/admin/verifications/:verificationId/reject
 * Body: { reason: "..." }
 */
const adminRejectVerification = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin authorization required."
      });
    }

    const { verificationId } = req.params;
    const { reason } = req.body;

    const record = await verificationService.rejectVerification({
      verificationId,
      adminId: req.user.id,
      reason: reason || "Document is unclear."
    });

    return res.json({
      success: true,
      message: "Provider identity verification rejected.",
      record
    });
  } catch (err) {
    console.error("adminRejectVerification error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to reject verification."
    });
  }
};

/**
 * Admin: Get Document Audit Logs
 * GET /api/admin/verifications/audit-logs
 */
const adminGetAuditLogs = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Admin authorization required."
      });
    }

    const logs = await auditService.getAuditLogs();
    return res.json({
      success: true,
      count: logs.length,
      logs
    });
  } catch (err) {
    console.error("adminGetAuditLogs error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve document audit logs.",
      error: err.message
    });
  }
};

module.exports = {
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
};
