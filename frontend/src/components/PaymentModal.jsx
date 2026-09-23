import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { openRazorpayCheckout, getUpiAppDeepLink } from "../utils/razorpay";

export default function PaymentModal({ booking, onClose, onPaymentSuccess }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [simulationResult, setSimulationResult] = useState(null);

  // Credit Card Form State
  const [cardNumber, setCardNumber] = useState("");
  const [cardHolder, setCardHolder] = useState(user?.name || "");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  // UPI Form State
  const [selectedUpiApp, setSelectedUpiApp] = useState("gpay");
  const [upiId, setUpiId] = useState("");

  if (!booking) return null;

  const serviceName = booking.services?.service_name || "SkillNest Service";
  const providerName = booking.provider?.full_name || "SkillNest Partner";
  const amount = Number(booking.total_amount) || 0;

  // Format Card Number with space every 4 digits
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
    setCardNumber(formatted);
  };

  // Format Expiry MM/YY
  const handleExpiryChange = (e) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 2) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Record completed payment in backend
  const recordPayment = async (txnId, gatewayMethod = "razorpay") => {
    setLoading(true);
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
          payment_method: gatewayMethod,
          transaction_id: txnId,
          simulate_status: "SUCCESS"
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Payment processing failed.");
      }

      setSimulationResult(data.payment);
      if (onPaymentSuccess) {
        onPaymentSuccess(data.payment);
      }
    } catch (err) {
      setError(err.message || "An error occurred during payment processing.");
    } finally {
      setLoading(false);
    }
  };

  // Immediate UPI App Selection + Redirection
  const handleSelectAndRedirectUpiApp = async (appId) => {
    setSelectedUpiApp(appId);
    setError("");

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // 1. On mobile devices, trigger native UPI app deep link
    if (isMobile) {
      const deepLink = getUpiAppDeepLink({
        amount,
        bookingId: booking.booking_id,
        app: appId
      });
      try {
        window.location.href = deepLink;
      } catch (e) {
        console.warn("Direct UPI intent trigger:", e);
      }
    }

    // 2. Open Razorpay Standard Checkout (displays QR code for desktop scanning or UPI collect)
    await openRazorpayCheckout({
      booking,
      amount,
      user,
      onSuccess: (rzpResp) => {
        recordPayment(rzpResp.razorpay_payment_id || `rzp_${Date.now()}`);
      },
      onDismiss: () => {
        setLoading(false);
      },
      onError: (errMsg) => {
        setError(errMsg);
        setLoading(false);
      }
    });
  };

  const handleProcessPayment = async (e) => {
    e?.preventDefault();
    setError("");

    // Validate based on selected method
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

      setLoading(true);
      // Attempt Razorpay card modal
      const launched = await openRazorpayCheckout({
        booking,
        amount,
        user,
        onSuccess: (rzpResp) => {
          recordPayment(rzpResp.razorpay_payment_id || `rzp_${Date.now()}`);
        },
        onDismiss: () => setLoading(false),
        onError: (errMsg) => {
          setError(errMsg);
          setLoading(false);
        }
      });

      if (!launched) {
        await recordPayment(`card_${Date.now()}`);
      }
    } else if (paymentMethod === "upi") {
      if (upiId.trim() && !upiId.includes("@")) {
        setError("Please enter a valid UPI ID (e.g. yourname@okhdfcbank or mobile@paytm).");
        return;
      }

      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        const deepLink = getUpiAppDeepLink({
          vpa: upiId.trim() || "skillnest@okaxis",
          amount,
          bookingId: booking.booking_id,
          app: selectedUpiApp
        });

        try {
          window.location.href = deepLink;
        } catch (e) {
          console.warn("UPI redirection:", e);
        }
      }

      setLoading(true);
      const launched = await openRazorpayCheckout({
        booking,
        amount,
        user,
        onSuccess: (rzpResp) => {
          recordPayment(rzpResp.razorpay_payment_id || `rzp_${Date.now()}`);
        },
        onDismiss: () => setLoading(false),
        onError: (errMsg) => {
          setError(errMsg);
          setLoading(false);
        }
      });

      if (!launched) {
        await recordPayment(`upi_${Date.now()}`);
      }
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
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          border: "1px solid #ebd08d"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg, #c98e1b, #a7700c)",
            padding: "22px 24px",
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
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              fontSize: "15px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
            Secure Checkout
          </div>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800" }}>Complete Your Payment</h2>
          <p style={{ margin: "2px 0 0 0", fontSize: "12px", opacity: 0.9 }}>
            SkillNest Instant Payment Gateway
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 24px" }}>
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
              borderRadius: "14px",
              padding: "14px 16px",
              marginBottom: "18px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", color: "#7a6b47" }}>Service</span>
              <strong style={{ fontSize: "13px", color: "#24202b" }}>{serviceName}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", color: "#7a6b47" }}>Provider</span>
              <span style={{ fontSize: "13px", color: "#382d12", fontWeight: "600" }}>{providerName}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                paddingTop: "8px",
                borderTop: "1px dashed #ebd08d",
                alignItems: "baseline"
              }}
            >
              <span style={{ fontSize: "13px", fontWeight: "700", color: "#382d12" }}>Total Payable</span>
              <strong style={{ fontSize: "20px", color: "#835b0a" }}>₹{amount.toFixed(2)}</strong>
            </div>
          </div>

          {simulationResult ? (
            /* Payment Completed View */
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  margin: "0 auto 14px auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  background: simulationResult.payment_status === "success" ? "#e1faea" : "#ffebeb",
                  color: simulationResult.payment_status === "success" ? "#107c39" : "#c41c1c"
                }}
              >
                {simulationResult.payment_status === "success" ? "✓" : "✕"}
              </div>

              <h3
                style={{
                  margin: "0 0 4px 0",
                  color: simulationResult.payment_status === "success" ? "#107c39" : "#c41c1c"
                }}
              >
                {simulationResult.payment_status === "success" ? "Payment Successful!" : "Payment Failed"}
              </h3>

              <p style={{ fontSize: "12px", color: "#6b6255", margin: "0 0 16px 0" }}>
                Transaction ID: <code>{simulationResult.transaction_id}</code>
              </p>

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={handleGoToResult}
                  style={{
                    flex: 1,
                    padding: "11px",
                    background: "#c98e1b",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  View Receipt →
                </button>
                <button
                  onClick={onClose}
                  style={{
                    padding: "11px 18px",
                    background: "#f4f1ea",
                    border: "1px solid #ebd08d",
                    color: "#68501e",
                    borderRadius: "10px",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer"
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Payment Method Selection & Inputs */
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
                Select Payment Method
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: paymentMethod === "card" ? "2px solid #c98e1b" : "1px solid #ebd08d",
                    background: paymentMethod === "card" ? "#fff6de" : "#ffffff",
                    fontSize: "13px",
                    fontWeight: paymentMethod === "card" ? "700" : "600",
                    color: "#382d12",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  💳 Credit / Debit Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: paymentMethod === "upi" ? "2px solid #c98e1b" : "1px solid #ebd08d",
                    background: paymentMethod === "upi" ? "#fff6de" : "#ffffff",
                    fontSize: "13px",
                    fontWeight: paymentMethod === "upi" ? "700" : "600",
                    color: "#382d12",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  📱 UPI / Apps
                </button>
              </div>

              {/* CARD DETAILS FORM */}
              {paymentMethod === "card" && (
                <div style={{ marginBottom: "18px", background: "#fcfbfa", padding: "14px", borderRadius: "12px", border: "1px solid #ebd08d" }}>
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
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid #ebd08d",
                        fontSize: "14px",
                        letterSpacing: "1px",
                        outline: "none",
                        background: "#ffffff"
                      }}
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
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid #ebd08d",
                        fontSize: "13px",
                        outline: "none",
                        background: "#ffffff"
                      }}
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
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: "8px",
                          border: "1px solid #ebd08d",
                          fontSize: "13px",
                          outline: "none",
                          background: "#ffffff"
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#68501e", marginBottom: "4px" }}>
                        CVV / CVC *
                      </label>
                      <input
                        type="password"
                        placeholder="•••"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value.slice(0, 4))}
                        maxLength={4}
                        style={{
                          width: "100%",
                          padding: "9px 12px",
                          borderRadius: "8px",
                          border: "1px solid #ebd08d",
                          fontSize: "13px",
                          outline: "none",
                          background: "#ffffff"
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* UPI REDIRECTION & DETAILS FORM */}
              {paymentMethod === "upi" && (
                <div style={{ marginBottom: "18px", background: "#fcfbfa", padding: "14px", borderRadius: "12px", border: "1px solid #ebd08d" }}>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#68501e", marginBottom: "8px" }}>
                    Select UPI App to Redirect
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
                          padding: "8px 4px",
                          borderRadius: "8px",
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
                        <span style={{ fontSize: "18px" }}>{app.icon}</span>
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
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid #ebd08d",
                        fontSize: "13px",
                        outline: "none",
                        background: "#ffffff"
                      }}
                    />
                    <span style={{ display: "block", fontSize: "11px", color: "#8a7536", marginTop: "6px", lineHeight: "1.4" }}>
                      📱 <strong>Mobile:</strong> Tapping any app opens PhonePe / GPay directly.<br />
                      💻 <strong>Desktop:</strong> Razorpay presents a QR code to scan with your phone, or enter your UPI ID.
                    </span>
                  </div>
                </div>
              )}

              {/* Pay Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "linear-gradient(135deg, #c98e1b, #a7700c)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "15px",
                    fontWeight: "800",
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: "0 4px 12px rgba(201,142,27,0.3)",
                    transition: "all 0.2s ease"
                  }}
                >
                  {loading
                    ? "Redirecting & Processing Payment..."
                    : `Pay ₹${amount.toFixed(2)} via Razorpay Gateway`}
                </button>

                <button
                  type="button"
                  onClick={() => recordPayment(`direct_test_${Date.now()}`)}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "10px",
                    background: "#fdfbf7",
                    color: "#835b0a",
                    border: "1px dashed #ebd08d",
                    borderRadius: "10px",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: loading ? "not-allowed" : "pointer"
                  }}
                >
                  ⚡ Direct Instant Confirmation (Demo Test Mode)
                </button>
              </div>

              <p style={{ margin: "10px 0 0 0", fontSize: "11px", color: "#8a7536", textAlign: "center" }}>
                🔒 256-Bit Encrypted Payment Processing · SkillNest Safe Pay
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
