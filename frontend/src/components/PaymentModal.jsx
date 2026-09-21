import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PaymentModal({ booking, onClose, onPaymentSuccess }) {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState("mock_card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [simulationResult, setSimulationResult] = useState(null);

  if (!booking) return null;

  const serviceName = booking.services?.service_name || "SkillNest Service";
  const providerName = booking.provider?.full_name || "SkillNest Partner";
  const amount = Number(booking.total_amount) || 0;

  const handleSimulatePayment = async (status) => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_id: booking.booking_id,
          amount: amount,
          payment_method: paymentMethod,
          simulate_status: status
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Payment simulation failed.");
      }

      setSimulationResult(data.payment);

      if (status === "SUCCESS") {
        if (onPaymentSuccess) {
          onPaymentSuccess(data.payment);
        }
      }
    } catch (err) {
      setError(err.message || "An error occurred during payment simulation.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToResult = () => {
    if (simulationResult) {
      navigate("/payment/result", {
        state: {
          payment: simulationResult,
          booking: booking
        }
      });
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1100,
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "480px",
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          border: "1px solid #ebd08d"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #c98e1b, #a7700c)",
            padding: "24px",
            color: "#ffffff",
            position: "relative"
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "rgba(255,255,255,0.2)",
              border: "none",
              color: "#ffffff",
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              fontSize: "16px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.25)", padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>
            Mock Payment Sandbox
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "800" }}>Complete Your Payment</h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", opacity: 0.9 }}>
            SkillNest Test Payment Gateway (Simulated)
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>
          {error && (
            <div
              style={{
                background: "#ffebeb",
                border: "1px solid #ffcccc",
                color: "#c41c1c",
                padding: "10px 14px",
                borderRadius: "10px",
                fontSize: "13px",
                marginBottom: "16px"
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Booking Summary Box */}
          <div
            style={{
              background: "#fffaf0",
              border: "1px solid #f1e0a8",
              borderRadius: "16px",
              padding: "16px",
              marginBottom: "20px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#7a6b47" }}>Service</span>
              <strong style={{ fontSize: "14px", color: "#24202b" }}>{serviceName}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#7a6b47" }}>Provider</span>
              <span style={{ fontSize: "13px", color: "#382d12", fontWeight: "600" }}>{providerName}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", color: "#7a6b47" }}>Scheduled For</span>
              <span style={{ fontSize: "13px", color: "#382d12" }}>
                {booking.booking_date} at {booking.booking_time}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "10px",
                borderTop: "1px dashed #ebd08d",
                alignItems: "baseline"
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: "700", color: "#382d12" }}>Total Amount</span>
              <strong style={{ fontSize: "22px", color: "#835b0a" }}>₹{amount.toFixed(2)}</strong>
            </div>
          </div>

          {simulationResult ? (
            /* Simulation Completed View */
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  margin: "0 auto 16px auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "30px",
                  background: simulationResult.payment_status === "success" ? "#e1faea" : "#ffebeb",
                  color: simulationResult.payment_status === "success" ? "#107c39" : "#c41c1c"
                }}
              >
                {simulationResult.payment_status === "success" ? "✓" : "✕"}
              </div>

              <h3
                style={{
                  margin: "0 0 6px 0",
                  color: simulationResult.payment_status === "success" ? "#107c39" : "#c41c1c"
                }}
              >
                {simulationResult.payment_status === "success" ? "Payment Successful!" : "Payment Failed"}
              </h3>

              <p style={{ fontSize: "13px", color: "#6b6255", margin: "0 0 16px 0" }}>
                Txn ID: <code>{simulationResult.transaction_id}</code>
              </p>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  onClick={handleGoToResult}
                  style={{
                    flex: 1,
                    padding: "12px",
                    background: "#c98e1b",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  View Full Receipt →
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: "12px 18px",
                    background: "#f4f1ea",
                    border: "1px solid #ebd08d",
                    color: "#68501e",
                    borderRadius: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Mock Simulation Controls */
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#68501e",
                  textTransform: "uppercase",
                  marginBottom: "8px"
                }}
              >
                Select Simulated Payment Method
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
                {[
                  { id: "mock_card", label: "💳 Credit / Debit Card" },
                  { id: "mock_upi", label: "📱 UPI (GPay / PhonePe)" },
                  { id: "mock_netbanking", label: "🏦 Net Banking" },
                  { id: "mock_wallet", label: "👛 SkillNest Wallet" }
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    style={{
                      padding: "10px",
                      borderRadius: "10px",
                      border: paymentMethod === m.id ? "2px solid #c98e1b" : "1px solid #ebd08d",
                      background: paymentMethod === m.id ? "#fff6de" : "#ffffff",
                      fontSize: "12px",
                      fontWeight: paymentMethod === m.id ? "700" : "500",
                      color: "#382d12",
                      cursor: "pointer",
                      textAlign: "left"
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div style={{ marginBottom: "16px" }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#68501e",
                    textTransform: "uppercase",
                    marginBottom: "8px"
                  }}
                >
                  Choose Mock Simulation Outcome
                </span>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => handleSimulatePayment("SUCCESS")}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: "14px",
                      background: "linear-gradient(135deg, #107c39, #0a5c29)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: "800",
                      cursor: loading ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 12px rgba(16,124,57,0.2)"
                    }}
                  >
                    {loading ? "Processing..." : "✓ Simulate SUCCESS"}
                  </button>

                  <button
                    onClick={() => handleSimulatePayment("FAILED")}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: "14px",
                      background: "linear-gradient(135deg, #c41c1c, #9c1515)",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "12px",
                      fontSize: "14px",
                      fontWeight: "800",
                      cursor: loading ? "not-allowed" : "pointer",
                      boxShadow: "0 4px 12px rgba(196,28,28,0.2)"
                    }}
                  >
                    {loading ? "Processing..." : "✕ Simulate FAILED"}
                  </button>
                </div>
              </div>

              <p style={{ margin: 0, fontSize: "11px", color: "#8a7536", textAlign: "center" }}>
                🔒 This is a test sandbox payment. No actual bank or card charges will occur.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
