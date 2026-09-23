import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { openRazorpayCheckout, getUpiAppDeepLink } from "../utils/razorpay";
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
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState(user?.name || "");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");
  const [upiId, setUpiId] = useState("");

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

  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 2) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  const recordPayment = async (txnId) => {
    setSubmitting(true);
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
          payment_method: "razorpay",
          transaction_id: txnId,
          simulate_status: "SUCCESS"
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Payment processing failed.");
      }

      navigate("/payment/result", {
        state: {
          payment: data.payment,
          booking: booking
        }
      });
    } catch (err) {
      console.error("Payment submission error:", err);
      setError(err.message || "Error processing payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectAndRedirectUpiApp = async (appId) => {
    setSelectedUpiApp(appId);
    setError("");

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const deepLink = getUpiAppDeepLink({
        amount: booking?.total_amount || 0,
        bookingId: booking?.booking_id,
        app: appId
      });

      try {
        window.location.href = deepLink;
      } catch (e) {
        console.warn("UPI intent trigger:", e);
      }
    }

    await openRazorpayCheckout({
      booking,
      amount: booking?.total_amount || 0,
      user,
      onSuccess: (rzpResp) => {
        recordPayment(rzpResp.razorpay_payment_id || `rzp_${Date.now()}`);
      },
      onDismiss: () => setSubmitting(false),
      onError: (errMsg) => {
        setError(errMsg);
        setSubmitting(false);
      }
    });
  };

  const handleProcessPayment = async () => {
    if (!booking) return;
    setError("");

    if (paymentMethod === "card") {
      const cleanNum = cardNumber.replace(/\s/g, "");
      if (cleanNum.length < 16) {
        setError("Please enter a valid 16-digit credit/debit card number.");
        return;
      }
      if (!cardHolder.trim()) {
        setError("Please enter the cardholder name.");
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        setError("Please enter a valid card expiry date (MM/YY).");
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        setError("Please enter a valid 3-digit CVV / CVC.");
        return;
      }

      setSubmitting(true);
      const launched = await openRazorpayCheckout({
        booking,
        amount: booking?.total_amount || 0,
        user,
        onSuccess: (rzpResp) => {
          recordPayment(rzpResp.razorpay_payment_id || `rzp_${Date.now()}`);
        },
        onDismiss: () => setSubmitting(false),
        onError: (errMsg) => {
          setError(errMsg);
          setSubmitting(false);
        }
      });

      if (!launched) {
        await recordPayment(`card_${Date.now()}`);
      }
    } else if (paymentMethod === "upi") {
      if (upiId.trim() && !upiId.includes("@")) {
        setError("Please enter a valid UPI ID (e.g. yourname@okhdfcbank).");
        return;
      }

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        const deepLink = getUpiAppDeepLink({
          vpa: upiId.trim() || "skillnest@okaxis",
          amount: booking.total_amount,
          bookingId: booking.booking_id,
          app: selectedUpiApp
        });

        try {
          window.location.href = deepLink;
        } catch (e) {}
      }

      setSubmitting(true);
      const launched = await openRazorpayCheckout({
        booking,
        amount: booking.total_amount,
        user,
        onSuccess: (rzpResp) => {
          recordPayment(rzpResp.razorpay_payment_id || `rzp_${Date.now()}`);
        },
        onDismiss: () => setSubmitting(false),
        onError: (errMsg) => {
          setError(errMsg);
          setSubmitting(false);
        }
      });

      if (!launched) {
        await recordPayment(`upi_${Date.now()}`);
      }
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
              Secure Test Payment Gateway · Sandbox Demo Simulation
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    border: paymentMethod === "card" ? "2px solid #c98e1b" : "1px solid #ebd08d",
                    background: paymentMethod === "card" ? "#fff6de" : "#ffffff",
                    fontSize: "13px",
                    fontWeight: paymentMethod === "card" ? "700" : "600",
                    color: "#382d12",
                    cursor: "pointer"
                  }}
                >
                  💳 Credit / Debit Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  style={{
                    padding: "12px",
                    borderRadius: "12px",
                    border: paymentMethod === "upi" ? "2px solid #c98e1b" : "1px solid #ebd08d",
                    background: paymentMethod === "upi" ? "#fff6de" : "#ffffff",
                    fontSize: "13px",
                    fontWeight: paymentMethod === "upi" ? "700" : "600",
                    color: "#382d12",
                    cursor: "pointer"
                  }}
                >
                  📱 UPI / Apps
                </button>
              </div>

              {/* CARD DETAILS FORM */}
              {paymentMethod === "card" && (
                <div style={{ marginBottom: "18px", background: "#fcfbfa", padding: "16px", borderRadius: "12px", border: "1px solid #ebd08d" }}>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#68501e", marginBottom: "4px" }}>
                      Card Number *
                    </label>
                    <input
                      type="text"
                      placeholder="4532 0000 0000 0000"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      maxLength={19}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "14px", letterSpacing: "1px" }}
                    />
                  </div>
                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#68501e", marginBottom: "4px" }}>
                      Cardholder Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Name on card"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px" }}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#68501e", marginBottom: "4px" }}>
                        Valid Thru *
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        maxLength={5}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#68501e", marginBottom: "4px" }}>
                        CVV *
                      </label>
                      <input
                        type="password"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.slice(0, 4))}
                        maxLength={4}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* UPI REDIRECTION */}
              {paymentMethod === "upi" && (
                <div style={{ marginBottom: "18px", background: "#fcfbfa", padding: "16px", borderRadius: "12px", border: "1px solid #ebd08d" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#68501e", marginBottom: "8px" }}>
                    Choose UPI App
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "14px" }}>
                    {[
                      { id: "gpay", name: "Google Pay", icon: "🌐" },
                      { id: "phonepe", name: "PhonePe", icon: "🟣" },
                      { id: "paytm", name: "Paytm", icon: "🔵" },
                      { id: "bhim", name: "BHIM", icon: "🇮🇳" }
                    ].map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => handleSelectAndRedirectUpiApp(app.id)}
                        style={{
                          padding: "10px 6px",
                          borderRadius: "10px",
                          border: selectedUpiApp === app.id ? "2px solid #c98e1b" : "1px solid #ebd08d",
                          background: selectedUpiApp === app.id ? "#fff6de" : "#ffffff",
                          fontSize: "11px",
                          fontWeight: "700",
                          color: "#382d12",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "4px",
                          transition: "all 0.2s ease"
                        }}
                        title={`Click to open ${app.name} or scan via Razorpay UPI`}
                      >
                        <span style={{ fontSize: "20px" }}>{app.icon}</span>
                        <span>{app.name}</span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#68501e", marginBottom: "4px" }}>
                      Or Enter UPI ID / VPA
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. yourname@okhdfcbank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #ebd08d", fontSize: "13px" }}
                    />
                    <span style={{ display: "block", fontSize: "11px", color: "#8a7536", marginTop: "6px", lineHeight: "1.4" }}>
                      📱 <strong>Mobile:</strong> Tapping any app opens PhonePe / GPay directly.<br />
                      💻 <strong>Desktop:</strong> Razorpay displays a QR code to scan with your phone, or enter your UPI ID.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Pay Button */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                onClick={handleProcessPayment}
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "linear-gradient(135deg, #c98e1b, #a7700c)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  fontSize: "15px",
                  fontWeight: "800",
                  cursor: submitting ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(201,142,27,0.3)"
                }}
              >
                {submitting
                  ? "Processing Payment..."
                  : `Pay ₹${amount.toFixed(2)} via Razorpay Gateway`}
              </button>

              <button
                type="button"
                onClick={() => recordPayment(`direct_test_${Date.now()}`)}
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "10px",
                  background: "#fdfbf7",
                  color: "#835b0a",
                  border: "1px dashed #ebd08d",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: submitting ? "not-allowed" : "pointer"
                }}
              >
                ⚡ Direct Instant Confirmation (Demo Test Mode)
              </button>

              <p style={{ margin: "6px 0 0 0", fontSize: "11px", color: "#8a7536", textAlign: "center" }}>
                🔒 256-Bit Encrypted Payment Gateway · SkillNest Safe Pay
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
