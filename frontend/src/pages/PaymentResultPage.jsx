import { useLocation, Link, useNavigate } from "react-router-dom";
import "./Dashboard.css";

export default function PaymentResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Extract payment and booking info passed from navigation state
  const payment = location.state?.payment;
  const booking = location.state?.booking;

  const isSuccess = payment?.payment_status === "success";
  const status = payment?.payment_status || "unknown";
  const amount = payment?.amount !== undefined ? Number(payment.amount).toFixed(2) : "0.00";
  const txnId = payment?.transaction_id || "TXN_MOCK_N/A";
  const dateStr = payment?.payment_date ? new Date(payment.payment_date).toLocaleString() : new Date().toLocaleString();

  return (
    <div className="dashboard-page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* NAVBAR */}
      <header className="dashboard-navbar">
        <Link to="/dashboard" className="dashboard-logo">
          <div className="mini-leaf-logo">
            <span></span><span></span><span></span>
          </div>
          <span>SkillNest Pay</span>
        </Link>
      </header>

      {/* RESULT CARD */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div
          style={{
            background: "#ffffff",
            borderRadius: "24px",
            border: "1px solid #ebd08d",
            maxWidth: "520px",
            width: "100%",
            padding: "36px",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(201,142,27,0.1)"
          }}
        >
          {/* Status Icon */}
          <div
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "50%",
              margin: "0 auto 20px auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "36px",
              background: isSuccess ? "#e1faea" : "#ffebeb",
              color: isSuccess ? "#107c39" : "#c41c1c",
              boxShadow: isSuccess
                ? "0 4px 15px rgba(16,124,57,0.2)"
                : "0 4px 15px rgba(196,28,28,0.2)"
            }}
          >
            {isSuccess ? "✓" : "✕"}
          </div>

          <span
            style={{
              display: "inline-block",
              padding: "4px 14px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: "800",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              background: isSuccess ? "#e1faea" : "#ffebeb",
              color: isSuccess ? "#107c39" : "#c41c1c",
              marginBottom: "10px"
            }}
          >
            {isSuccess ? "Transaction Successful" : "Transaction Failed"}
          </span>

          <h1 style={{ margin: "0 0 8px 0", fontSize: "26px", color: "#24202b" }}>
            {isSuccess ? "Payment Completed!" : "Payment Simulation Failed"}
          </h1>

          <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "#6b6255" }}>
            {isSuccess
              ? "Your simulated payment has been verified. The service provider has been notified."
              : "Your payment simulation ended with a failure status. No charges were made."}
          </p>

          {/* Receipt Details Box */}
          <div
            style={{
              background: "#fffaf0",
              borderRadius: "16px",
              border: "1px solid #f1e0a8",
              padding: "20px",
              textAlign: "left",
              marginBottom: "28px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", color: "#7a6b47" }}>Amount Paid</span>
              <strong style={{ fontSize: "18px", color: "#835b0a" }}>₹{amount}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "13px", color: "#7a6b47" }}>Transaction ID</span>
              <code style={{ fontSize: "12px", color: "#382d12", background: "#f4f1ea", padding: "2px 6px", borderRadius: "4px" }}>
                {txnId}
              </code>
            </div>

            {booking && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <span style={{ fontSize: "13px", color: "#7a6b47" }}>Service</span>
                <span style={{ fontSize: "13px", color: "#382d12", fontWeight: "600" }}>
                  {booking.services?.service_name || "Service"}
                </span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
              <span style={{ fontSize: "13px", color: "#7a6b47" }}>Payment Method</span>
              <span style={{ fontSize: "13px", color: "#382d12", textTransform: "capitalize" }}>
                {payment?.payment_method?.replace("_", " ") || "Mock Payment"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: "13px", color: "#7a6b47" }}>Date & Time</span>
              <span style={{ fontSize: "13px", color: "#382d12" }}>{dateStr}</span>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link
              to="/dashboard"
              style={{
                display: "block",
                padding: "14px",
                background: "linear-gradient(135deg, #c98e1b, #a7700c)",
                color: "#ffffff",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: "700",
                fontSize: "14px",
                boxShadow: "0 4px 15px rgba(201,142,27,0.25)"
              }}
            >
              Return to My Bookings →
            </Link>

            {!isSuccess && booking && (
              <button
                onClick={() => navigate(`/payment/${booking.booking_id}`)}
                style={{
                  padding: "12px",
                  background: "#ffffff",
                  color: "#835b0a",
                  border: "1px solid #ebd08d",
                  borderRadius: "12px",
                  fontWeight: "700",
                  fontSize: "13px",
                  cursor: "pointer"
                }}
              >
                ↻ Try Simulation Again
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
