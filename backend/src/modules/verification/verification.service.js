const fs = require("fs");
const path = require("path");
const supabase = require("../../config/supabase");
const notificationService = require("../payments-notifications/notification.service");

const DATA_DIR = path.resolve(__dirname, "../../../data");
const VERIFICATIONS_FILE = path.join(DATA_DIR, "verifications.json");
const PRIVATE_DOCS_DIR = path.resolve(__dirname, "../../../private_uploads/documents");

// Ensure directories and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PRIVATE_DOCS_DIR)) {
  fs.mkdirSync(PRIVATE_DOCS_DIR, { recursive: true });
}
if (!fs.existsSync(VERIFICATIONS_FILE)) {
  fs.writeFileSync(VERIFICATIONS_FILE, JSON.stringify([]));
}

function readVerifications() {
  try {
    const raw = fs.readFileSync(VERIFICATIONS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeVerifications(data) {
  fs.writeFileSync(VERIFICATIONS_FILE, JSON.stringify(data, null, 2));
}

/**
 * KYC / Identity Verification Service
 * Supports secure private document attachments, status tracking, admin review, and notifications.
 */
class VerificationService {
  /**
   * Start a new verification session for a provider
   * @param {string} userId - UUID of user
   */
  async startVerification(userId) {
    const verificationReference = `kyc_ref_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const now = new Date().toISOString();

    const verifications = readVerifications();
    const existingIndex = verifications.findIndex((v) => v.user_id === userId);

    const record = {
      id: existingIndex >= 0 ? verifications[existingIndex].id : `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      status: "PENDING",
      provider: "MOCK_DEVELOPMENT_KYC",
      verification_reference: verificationReference,
      documents: existingIndex >= 0 && verifications[existingIndex].documents ? verifications[existingIndex].documents : [],
      verified_at: null,
      created_at: existingIndex >= 0 ? verifications[existingIndex].created_at : now,
      updated_at: now
    };

    if (existingIndex >= 0) {
      verifications[existingIndex] = record;
    } else {
      verifications.unshift(record);
    }
    writeVerifications(verifications);

    return record;
  }

  /**
   * Get verification status for a user
   * @param {string} userId
   */
  async getStatus(userId) {
    const verifications = readVerifications();
    const record = verifications.find((v) => v.user_id === userId);

    if (!record) {
      return {
        status: "NOT_VERIFIED",
        verified: false,
        message: "Identity verification has not been initiated.",
        documents: []
      };
    }

    return {
      id: record.id,
      status: record.status,
      verified: record.status === "VERIFIED",
      verification_reference: record.verification_reference,
      provider: record.provider,
      documents: (record.documents || []).map((d) => ({
        id: d.id,
        document_type: d.document_type,
        original_name: d.original_name,
        mime_type: d.mime_type,
        file_size: d.file_size,
        uploaded_at: d.uploaded_at
      })),
      failure_reason: record.failure_reason || null,
      verified_at: record.verified_at,
      created_at: record.created_at
    };
  }

  /**
   * Attach a verification document to a provider's verification session
   * @param {Object} options
   * @param {string} options.userId
   * @param {string} options.documentType - "Government ID" | "Additional document"
   * @param {Object} options.file - Multer file object
   */
  async attachDocument({ userId, documentType = "Government ID", file }) {
    if (!userId) throw new Error("User ID is required.");
    if (!file) throw new Error("File is required.");

    const verifications = readVerifications();
    let recordIndex = verifications.findIndex((v) => v.user_id === userId);
    let record;

    if (recordIndex === -1) {
      record = await this.startVerification(userId);
      recordIndex = 0;
    } else {
      record = verifications[recordIndex];
    }

    if (!record.documents) {
      record.documents = [];
    }

    // Document metadata without sensitive OCR or raw ID numbers
    const docEntry = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      document_type: documentType.trim() || "Government ID",
      original_name: file.originalname,
      filename: file.filename,
      mime_type: file.mimetype,
      file_size: file.size,
      storage_path: path.relative(path.resolve(__dirname, "../../../"), file.path).replace(/\\/g, "/"),
      uploaded_at: new Date().toISOString()
    };

    // If a document of same type exists, replace it
    const existingDocIdx = record.documents.findIndex(
      (d) => d.document_type.toLowerCase() === docEntry.document_type.toLowerCase()
    );
    if (existingDocIdx >= 0) {
      // Clean up old file if exists
      let oldFilePath = oldDoc.storage_path;
      if (oldFilePath && !path.isAbsolute(oldFilePath)) {
        oldFilePath = path.resolve(__dirname, "../../../", oldFilePath);
      }
      if (oldFilePath && fs.existsSync(oldFilePath)) {
        try {
          fs.unlinkSync(oldFilePath);
        } catch (e) {
          console.warn("Could not delete old document file:", e.message);
        }
      }
      record.documents[existingDocIdx] = docEntry;
    } else {
      record.documents.push(docEntry);
    }

    record.updated_at = new Date().toISOString();
    verifications[recordIndex] = record;
    writeVerifications(verifications);

    return {
      success: true,
      document: {
        id: docEntry.id,
        document_type: docEntry.document_type,
        original_name: docEntry.original_name,
        mime_type: docEntry.mime_type,
        file_size: docEntry.file_size,
        uploaded_at: docEntry.uploaded_at
      }
    };
  }

  /**
   * Get single verification record by ID
   * @param {string} verificationId
   */
  async getVerificationById(verificationId) {
    const verifications = readVerifications();
    return verifications.find((v) => v.id === verificationId || v.user_id === verificationId);
  }

  /**
   * Get document metadata and file path by verification ID and document ID
   * @param {Object} query
   * @param {string} query.verificationId
   * @param {string} query.documentId
   */
  async getDocument({ verificationId, documentId }) {
    const record = await this.getVerificationById(verificationId);
    if (!record) {
      return null;
    }

    const doc = (record.documents || []).find((d) => d.id === documentId);
    if (!doc) {
      return null;
    }

    return {
      verification: record,
      document: doc
    };
  }

  /**
   * Admin approves verification
   * @param {Object} options
   * @param {string} options.verificationId
   * @param {string} options.adminId
   */
  async approveVerification({ verificationId, adminId }) {
    const verifications = readVerifications();
    const index = verifications.findIndex((v) => v.id === verificationId || v.user_id === verificationId);

    if (index === -1) {
      throw new Error("Verification record not found.");
    }

    const record = verifications[index];
    const now = new Date().toISOString();

    record.status = "VERIFIED";
    record.verified_at = now;
    record.updated_at = now;
    record.failure_reason = null;
    record.verified_by_admin = adminId;

    writeVerifications(verifications);

    // Update user table in Supabase
    try {
      await supabase
        .from("users")
        .update({
          is_verified: true,
          updated_at: now
        })
        .eq("user_id", record.user_id);
    } catch (e) {
      console.error("Failed to update user is_verified in Supabase:", e.message);
    }

    // Send in-app notification to provider
    try {
      await notificationService.createNotification({
        userId: record.user_id,
        title: "Identity Verification Approved",
        message: "Your government identity documents have been approved by SkillNest Administration! Your profile now displays the Verified Provider badge."
      });
    } catch (notifErr) {
      console.error("Approve notification error:", notifErr);
    }

    return record;
  }

  /**
   * Admin rejects verification with reason
   * @param {Object} options
   * @param {string} options.verificationId
   * @param {string} options.adminId
   * @param {string} [options.reason]
   */
  async rejectVerification({ verificationId, adminId, reason = "Document is unclear" }) {
    const verifications = readVerifications();
    const index = verifications.findIndex((v) => v.id === verificationId || v.user_id === verificationId);

    if (index === -1) {
      throw new Error("Verification record not found.");
    }

    const record = verifications[index];
    const now = new Date().toISOString();

    record.status = "FAILED";
    record.verified_at = null;
    record.failure_reason = reason.trim() || "Document is unclear.";
    record.updated_at = now;
    record.rejected_by_admin = adminId;

    writeVerifications(verifications);

    // Update user table in Supabase
    try {
      await supabase
        .from("users")
        .update({
          is_verified: false,
          updated_at: now
        })
        .eq("user_id", record.user_id);
    } catch (e) {
      console.error("Failed to update user is_verified in Supabase:", e.message);
    }

    // Send in-app notification to provider
    try {
      await notificationService.createNotification({
        userId: record.user_id,
        title: "Identity Verification Rejected",
        message: `Your identity verification was rejected. Reason: ${record.failure_reason}`
      });
    } catch (notifErr) {
      console.error("Reject notification error:", notifErr);
    }

    return record;
  }

  /**
   * Process a simulated KYC result (Development only)
   */
  async processMockResult({ userId, status, reason = null }) {
    const normalizedStatus = (status || "").toUpperCase();
    if (!["VERIFIED", "FAILED"].includes(normalizedStatus)) {
      throw new Error("Invalid mock result status. Allowed: 'VERIFIED' or 'FAILED'");
    }

    const now = new Date().toISOString();
    const isVerified = normalizedStatus === "VERIFIED";

    // 1. Update verification record
    const verifications = readVerifications();
    let record = verifications.find((v) => v.user_id === userId);

    if (!record) {
      record = {
        id: `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        user_id: userId,
        status: normalizedStatus,
        provider: "MOCK_DEVELOPMENT_KYC",
        verification_reference: `kyc_mock_${Date.now()}`,
        documents: [],
        verified_at: isVerified ? now : null,
        created_at: now,
        updated_at: now
      };
      verifications.unshift(record);
    } else {
      record.status = normalizedStatus;
      record.verified_at = isVerified ? now : null;
      record.updated_at = now;
      if (reason) record.failure_reason = reason;
      else if (isVerified) record.failure_reason = null;
    }
    writeVerifications(verifications);

    // 2. Update users table in Supabase
    try {
      await supabase
        .from("users")
        .update({
          is_verified: isVerified,
          updated_at: now
        })
        .eq("user_id", userId);
    } catch (dbErr) {
      console.error("Failed to update user is_verified in Supabase:", dbErr);
    }

    // 3. Dispatch in-app notification
    const title = isVerified ? "Identity Verification Successful" : "Identity Verification Failed";
    const message = isVerified
      ? "Your government ID & liveness verification is complete! Your profile now displays the Verified badge."
      : `Your identity verification could not be completed. ${reason || "Please review your documents and try again."}`;

    await notificationService.createNotification({
      userId,
      title,
      message
    });

    return record;
  }

  /**
   * Admin: List all verifications
   */
  async getAllVerifications() {
    return readVerifications();
  }
}

module.exports = new VerificationService();
