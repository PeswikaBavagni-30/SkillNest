import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function VerificationModal({ isOpen, onClose, onVerificationUpdated }) {
  const { token, user, updateUser } = useAuth();
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("Government ID");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (isOpen && token) {
      fetchStatus();
    }
  }, [isOpen, token]);

  const fetchStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5000/api/verification/status", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStatusData(data.data);
      }
    } catch (err) {
      console.error("Fetch verification status error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartVerification = async () => {
    setActionLoading(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("http://localhost:5000/api/verification/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to initiate verification.");
      }
      setStatusData({
        status: "PENDING",
        verified: false,
        verification_reference: data.verification_reference,
        provider: data.provider,
        documents: []
      });
      setNotice("Verification session initiated! Please upload your verification documents below.");
    } catch (err) {
      setError(err.message || "Unable to start verification.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (e, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("document_type", docType);

      const res = await fetch("http://localhost:5000/api/verification/upload-document", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Document upload failed.");
      }

      setNotice(`✓ ${docType} uploaded securely to private storage.`);
      fetchStatus();
    } catch (err) {
      setError(err.message || "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
      e.target.value = "";
    }
  };

  if (!isOpen) return null;

  const currentStatus = statusData?.status || (user?.is_verified ? "VERIFIED" : "NOT_VERIFIED");
  const isVerified = currentStatus === "VERIFIED";
  const isPending = currentStatus === "PENDING";
  const isFailed = currentStatus === "FAILED";
  const uploadedDocs = statusData?.documents || [];

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(35, 27, 8, 0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          maxWidth: "540px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "32px",
          border: "1px solid #ebd08d",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          position: "relative"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            background: "#f4f1ea",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            cursor: "pointer",
            fontWeight: "700",
            color: "#68501e"
          }}
        >
          ✕
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <span style={{ fontSize: "28px" }}>🛡️</span>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", color: "#24202b" }}>Provider Identity Verification</h2>
            <span style={{ fontSize: "12px", color: "#7a6b47" }}>Private & Secure Document Verification</span>
          </div>
        </div>

        <p style={{ fontSize: "13px", color: "#5c5346", lineHeight: "1.5", margin: "14px 0 18px 0" }}>
          Upload your verification documents for administrator approval. Documents are encrypted and held in strictly private storage. Normal customers or providers never have access to your personal documents.
        </p>

        {notice && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "600",
              marginBottom: "16px",
              background: isVerified ? "#e1faea" : "#fff8e6",
              color: isVerified ? "#107c39" : "#835b0a",
              border: isVerified ? "1px solid #b7ebd0" : "1px solid #ebd08d"
            }}
          >
            {notice}
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "10px",
              fontSize: "13px",
              background: "#ffebeb",
              color: "#c41c1c",
              border: "1px solid #ffcccc",
              marginBottom: "16px"
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Current Status Badge Card */}
        <div
          style={{
            background: "#fffaf0",
            borderRadius: "16px",
            padding: "16px",
            border: "1px solid #f1e0a8",
            marginBottom: "20px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", color: "#7a6b47", fontWeight: "600" }}>Verification Status</span>
            <span
              style={{
                padding: "5px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "800",
                textTransform: "uppercase",
                background: isVerified ? "#e1faea" : isPending ? "#fff4cc" : isFailed ? "#ffebeb" : "#f4f1ea",
                color: isVerified ? "#107c39" : isPending ? "#916a00" : isFailed ? "#c41c1c" : "#68501e"
              }}
            >
              {isVerified ? "✓ Verified" : isPending ? "⏳ Pending Review" : isFailed ? "✕ Verification Failed" : "Not Verified"}
            </span>
          </div>

          {statusData?.verification_reference && (
            <div style={{ marginTop: "10px", fontSize: "12px", color: "#8a7536" }}>
              Reference: <code>{statusData.verification_reference}</code>
            </div>
          )}

          {statusData?.failure_reason && (
            <div style={{ marginTop: "8px", fontSize: "12px", color: "#c41c1c", background: "#fff5f5", padding: "8px 12px", borderRadius: "8px" }}>
              <strong>Admin Note:</strong> {statusData.failure_reason}
            </div>
          )}

          {statusData?.verified_at && (
            <div style={{ marginTop: "6px", fontSize: "11px", color: "#9c8e76" }}>
              Verified on: {new Date(statusData.verified_at).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Secure Document Upload Section */}
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#24202b", marginBottom: "10px" }}>
            📑 Identity & Proof Documents (Private)
          </h3>

          {/* Uploaded Documents List */}
          {uploadedDocs.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
              {uploadedDocs.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    background: "#f8f9fa",
                    borderRadius: "10px",
                    border: "1px solid #e9ecef"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#1e293b" }}>
                      📄 {doc.document_type}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748b" }}>
                      {doc.original_name} • {(doc.file_size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <span style={{ fontSize: "11.5px", color: "#16a34a", fontWeight: "700" }}>
                    ✓ Uploaded
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Upload buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <label
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px 10px",
                borderRadius: "10px",
                border: "1px dashed #c98e1b",
                background: "#fefbf6",
                cursor: uploadingDoc ? "wait" : "pointer",
                fontSize: "12px",
                fontWeight: "700",
                color: "#68501e"
              }}
            >
              {uploadingDoc ? "Uploading..." : "📤 Upload Government ID"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                style={{ display: "none" }}
                disabled={uploadingDoc}
                onChange={(e) => handleFileUpload(e, "Government ID")}
              />
            </label>

            <label
              style={{
                display: "block",
                textAlign: "center",
                padding: "12px 10px",
                borderRadius: "10px",
                border: "1px dashed #cbd5e1",
                background: "#f8fafc",
                cursor: uploadingDoc ? "wait" : "pointer",
                fontSize: "12px",
                fontWeight: "700",
                color: "#475569"
              }}
            >
              {uploadingDoc ? "Uploading..." : "📎 Additional Document"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,application/pdf"
                style={{ display: "none" }}
                disabled={uploadingDoc}
                onChange={(e) => handleFileUpload(e, "Additional document")}
              />
            </label>
          </div>
        </div>

        {/* Verification Controls */}
        {isVerified ? (
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <p style={{ color: "#107c39", fontWeight: "700", fontSize: "14px" }}>
              ✓ Your identity is officially verified.
            </p>
            <span style={{ fontSize: "12px", color: "#7a6b47" }}>
              Clients can see your verified badge on all your service cards.
            </span>
          </div>
        ) : isPending ? (
          <div
            style={{
              background: "#fffdf5",
              border: "1px solid #ebd08d",
              borderRadius: "14px",
              padding: "20px",
              textAlign: "center"
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>⏳</div>
            <h4 style={{ margin: "0 0 6px 0", color: "#835b0a", fontSize: "15px", fontWeight: "800" }}>
              Verification Under Review by Admin
            </h4>
            <p style={{ margin: 0, fontSize: "13px", color: "#68501e", lineHeight: "1.5" }}>
              Your identity proof has been submitted securely. An authorized SkillNest administrator will inspect your documentation and update your verified status.
            </p>
          </div>
        ) : (
          <div>
            <button
              onClick={handleStartVerification}
              disabled={actionLoading}
              style={{
                width: "100%",
                padding: "14px",
                background: "linear-gradient(135deg, #c98e1b, #a7700c)",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                fontWeight: "700",
                fontSize: "15px",
                cursor: actionLoading ? "wait" : "pointer",
                boxShadow: "0 4px 12px rgba(201,142,27,0.25)"
              }}
            >
              {actionLoading ? "Initiating..." : "Start Identity Verification →"}
            </button>
          </div>
        )}

        <div style={{ marginTop: "18px", borderTop: "1px solid #f4f1ea", paddingTop: "12px" }}>
          <p style={{ margin: 0, fontSize: "11px", color: "#a8997a", lineHeight: "1.4" }}>
            Disclaimer: Identity verification verifies government identification authenticity.
            Documents are stored in a private directory and only reviewed by authorized administrators.
          </p>
        </div>
      </div>
    </div>
  );
}
