import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

export default function PaymentPage() {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [booking, setBooking] = useState(null);
  const [existingPayment, setExistingPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("mock_card");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchBookingAndPayment();
  }, [bookingId, token]);

  const fetchBookingAndPayment = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch booking details
      const bRes = await fetch(`http://localhost:5000/api/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const bData = await bRes.json();

      if (!bRes.ok || !bData.success) {
        throw new Error(bData.message || "Failed to load booking details.");
      }

      setBooking(bData.booking);

      // 2. Fetch existing payment record if any
      const pRes = await fetch(`http://localhost:5000/api/payments/${bookingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const pData = await pRes.json();
      if (pData.success && pData.payment) {
        setExistingPayment(pData.payment);
      }
    } catch (err) {
      console.error("PaymentPage fetch error:", err);
      setError(err.message || "Unable to retrieve booking information.");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePayment = async (status) => {
    if (!booking) return;
    setSubmitting(true);
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
          amount: booking.total_amount,
          payment_method: paymentMethod,
          simulate_status: status
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Payment simulation failed.");
      }

      // Navigate to Payment Result Page
      navigate("/payment/result", {
        state: {
          payment: data.payment,
          booking: booking
        }
      });
    } catch (err) {
      console.error("Payment submission error:", err);
      setError(err.message || "Error processing mock payment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="mini-leaf-logo" style={{ margin: "0 auto 16px auto" }}>
            <span></span><span></span><span></span>
          </div>
          <h3 style={{ color: "#835b0a" }}>Loading Payment Checkout...</h3>
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="dashboard-page" style={{ padding: "40px 20px" }}>
        <div
          style={{
            maxWidth: "500px",
            margin: "40px auto",
            background: "#ffffff",
            padding: "30px",
            borderRadius: "20px",
            border: "1px solid #ebd08d",
            textAlign: "center"
          }}
        >
          <span style={{ fontSize: "40px" }}>⚠️</span>
          <h2 style={{ color: "#c41c1c", marginTop: "12px" }}>Booking Not Found</h2>
          <p style={{ color: "#7a6b47" }}>{error}</p>
          <Link
            to="/dashboard"
            style={{
              display: "inline-block",
              marginTop: "16px",
              padding: "10px 20px",
              background: "#c98e1b",
              color: "#ffffff",
              borderRadius: "10px",
              textDecoration: "none",
              fontWeight: "700"
            }}
          >
            ← Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const serviceName = booking.services?.service_name || "Service Booking";
  const providerName = booking.provider?.full_name || "SkillNest Partner";
  const amount = Number(booking.total_amount) || 0;
  const isAlreadyPaid = existingPayment && existingPayment.payment_status === "success";

  return (
    <div className="dashboard-page">
      {/* NAVBAR */}
      <header className="dashboard-navbar">
        <Link to="/dashboard" className="dashboard-logo">
          <div className="mini-leaf-logo">
            <span></span><span></span><span></span>
          </div>
          <span>SkillNest Pay</span>
        </Link>

        <div className="dashboard-navbar-right">
          <Link
            to="/dashboard"
            style={{
              padding: "8px 16px",
              background: "#fff6de",
              border: "1px solid #ebd08d",
              borderRadius: "10px",
              color: "#835b0a",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "13px"
            }}
          >
            ← Back to Bookings
          </Link>
        </div>
      </header>

      {/* CONTENT */}
      <main style={{ maxWidth: "800px", margin: "40px auto", padding: "0 20px" }}>
        {/* Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #fff2d6, #ffe6ad)",
            border: "1px solid #ebd08d",
            borderRadius: "16px",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
            flexWrap: "wrap",
            gap: "10px"
          }}
        >
          <div>
            <strong style={{ color: "#835b0a", fontSize: "14px" }}>🧪 Sandbox Test Gateway</strong>
            <p style={{ margin: "2px 0 0 0", color: "#68501e", fontSize: "12px" }}>
              Member 4 Mock Payment System · No real money will be transferred
            </p>
          </div>
          <span
            style={{
              background: "#835b0a",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "11px",
              fontWeight: "700"
            }}
          >
            TEST MODE ACTIVE
          </span>
        </div>

        {error && (
          <div
            style={{
              background: "#ffebeb",
              border: "1px solid #ffcccc",
              color: "#c41c1c",
              padding: "12px 16px",
              borderRadius: "12px",
              marginBottom: "20px",
              fontSize: "14px"
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Order Details Column */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              border: "1px solid #f1e0a8",
              boxShadow: "0 4px 15px rgba(201,142,27,0.06)"
            }}
          >
            <span style={{ fontSize: "11px", fontWeight: "800", color: "#c98e1b", textTransform: "uppercase" }}>
              Booking Summary
            </span>
            <h2 style={{ margin: "6px 0 16px 0", fontSize: "20px", color: "#24202b" }}>{serviceName}</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#7a6b47", fontSize: "13px" }}>Verified Provider</span>
                <strong style={{ color: "#382d12", fontSize: "13px" }}>{providerName}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#7a6b47", fontSize: "13px" }}>Scheduled Date</span>
                <span style={{ color: "#382d12", fontSize: "13px" }}>{booking.booking_date}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#7a6b47", fontSize: "13px" }}>Service Time</span>
                <span style={{ color: "#382d12", fontSize: "13px" }}>{booking.booking_time}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#7a6b47", fontSize: "13px" }}>Delivery Address</span>
                <span style={{ color: "#382d12", fontSize: "13px", maxWidth: "180px", textAlign: "right" }}>
                  {booking.address}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#7a6b47", fontSize: "13px" }}>Booking Status</span>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "10px",
                    fontSize: "11px",
                    fontWeight: "800",
                    textTransform: "uppercase",
                    background: "#e1faea",
                    color: "#107c39"
                  }}
                >
                  {booking.status}
                </span>
              </div>

              {existingPayment && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#7a6b47", fontSize: "13px" }}>Payment Status</span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "11px",
                      fontWeight: "800",
                      textTransform: "uppercase",
                      background: isAlreadyPaid ? "#e1faea" : "#fff4cc",
                      color: isAlreadyPaid ? "#107c39" : "#916a00"
                    }}
                  >
                    {existingPayment.payment_status}
                  </span>
                </div>
              )}

              <div
                style={{
                  borderTop: "1px dashed #ebd08d",
                  paddingTop: "16px",
                  marginTop: "8px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline"
                }}
              >
                <span style={{ fontSize: "16px", fontWeight: "700", color: "#382d12" }}>Total Payable</span>
                <strong style={{ fontSize: "28px", color: "#835b0a" }}>₹{amount.toFixed(2)}</strong>
              </div>
            </div>
          </div>

          {/* Payment Simulation Column */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              border: "1px solid #f1e0a8",
              boxShadow: "0 4px 15px rgba(201,142,27,0.06)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              <span style={{ fontSize: "11px", fontWeight: "800", color: "#c98e1b", textTransform: "uppercase" }}>
                Payment Method
              </span>
              <h3 style={{ margin: "6px 0 16px 0", fontSize: "18px", color: "#24202b" }}>
                Choose Mock Option
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                {[
                  { id: "mock_card", name: "Credit / Debit Card", desc: "Visa, Mastercard, RuPay (Simulated)" },
                  { id: "mock_upi", name: "UPI Instant Pay", desc: "Google Pay, PhonePe, Paytm (Simulated)" },
                  { id: "mock_netbanking", name: "Net Banking", desc: "All major banks (Simulated)" },
                  { id: "mock_wallet", name: "SkillNest Balance", desc: "Instant checkout" }
                ].map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: paymentMethod === m.id ? "2px solid #c98e1b" : "1px solid #ebd08d",
                      background: paymentMethod === m.id ? "#fff9eb" : "#ffffff",
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: "700", color: "#382d12" }}>{m.name}</div>
                      <div style={{ fontSize: "11px", color: "#7a6b47" }}>{m.desc}</div>
                    </div>
                    <span style={{ fontSize: "16px", color: paymentMethod === m.id ? "#c98e1b" : "#ccc" }}>
                      {paymentMethod === m.id ? "◉" : "○"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulation CTA Buttons */}
            <div>
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
                Execute Mock Simulation
              </span>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  onClick={() => handleSimulatePayment("SUCCESS")}
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "linear-gradient(135deg, #107c39, #0a5c29)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "15px",
                    fontWeight: "800",
                    cursor: submitting ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 14px rgba(16,124,57,0.25)"
                  }}
                >
                  {submitting ? "Processing Transaction..." : "✓ Pay ₹" + amount.toFixed(2) + " (Simulate SUCCESS)"}
                </button>

                <button
                  onClick={() => handleSimulatePayment("FAILED")}
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "12px",
                    background: "#fff2f2",
                    color: "#c41c1c",
                    border: "1px solid #ffcccc",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontWeight: "700",
                    cursor: submitting ? "not-allowed" : "pointer"
                  }}
                >
                  ✕ Simulate Payment FAILED
                </button>
              </div>

              <p style={{ margin: "14px 0 0 0", fontSize: "11px", color: "#8a7536", textAlign: "center" }}>
                Simulating success triggers in-app notifications and marks payment as SUCCESS.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
