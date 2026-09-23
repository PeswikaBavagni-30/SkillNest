const fs = require("fs");
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "../../../data");
const AUDIT_LOGS_FILE = path.join(DATA_DIR, "document_audit_logs.json");

// Ensure audit log file exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(AUDIT_LOGS_FILE)) {
  fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify([]));
}

function readAuditLogs() {
  try {
    return JSON.parse(fs.readFileSync(AUDIT_LOGS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeAuditLogs(data) {
  fs.writeFileSync(AUDIT_LOGS_FILE, JSON.stringify(data, null, 2));
}

class DocumentAuditService {
  /**
   * Record an audit entry when an admin views a sensitive provider document
   * @param {Object} entry
   * @param {string} entry.adminId - UUID of the viewing administrator
   * @param {string} entry.providerId - UUID of the document owner
   * @param {string} entry.documentId - Unique document identifier
   * @param {string} [entry.action] - "ADMIN_DOCUMENT_VIEWED"
   */
  async logDocumentView({ adminId, providerId, documentId, action = "ADMIN_DOCUMENT_VIEWED" }) {
    if (!adminId || !documentId) {
      throw new Error("adminId and documentId are required for document audit logging.");
    }

    const logs = readAuditLogs();
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      admin_id: adminId,
      provider_id: providerId || "UNKNOWN",
      document_id: documentId,
      action: action || "ADMIN_DOCUMENT_VIEWED",
      timestamp: new Date().toISOString()
    };

    logs.unshift(entry);
    writeAuditLogs(logs);

    return entry;
  }

  /**
   * Retrieve document audit logs for administrators
   */
  async getAuditLogs() {
    return readAuditLogs();
  }
}

module.exports = new DocumentAuditService();
