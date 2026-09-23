/**
 * Razorpay Standard Checkout & UPI App Integration Helper
 */

// Load Razorpay Checkout.js script dynamically
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.warn("Failed to load official Razorpay checkout.js script.");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

/**
 * Generate UPI deep links for specific UPI applications
 * @param {Object} params - { vpa, name, amount, bookingId, app }
 */
export function getUpiAppDeepLink({ vpa = "skillnest@okaxis", name = "SkillNest", amount, bookingId, app = "universal" }) {
  const cleanAmount = Number(amount).toFixed(2);
  const note = `SkillNest_Booking_${bookingId || "Pay"}`;
  const query = `pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent(note)}`;

  switch (app) {
    case "phonepe":
      return `phonepe://pay?${query}`;
    case "gpay":
      return `tez://upi/pay?${query}`;
    case "paytm":
      return `paytmmp://pay?${query}`;
    case "bhim":
      return `upi://pay?${query}`;
    default:
      return `upi://pay?${query}`;
  }
}

/**
 * Launch Real Razorpay Standard Checkout Modal
 * @param {Object} options - Config options
 * @returns {Promise<Object>} - Resolves with payment response { razorpay_payment_id, ... }
 */
export async function openRazorpayCheckout({
  booking,
  amount,
  user,
  preferredMethod = "upi",
  onSuccess,
  onDismiss,
  onError
}) {
  const isLoaded = await loadRazorpayScript();

  const keyId = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag";
  const serviceName = booking?.services?.service_name || "SkillNest Service";
  const amountInPaise = Math.round((Number(amount) || 0) * 100);

  if (isLoaded && window.Razorpay) {
    try {
      const rzpOptions = {
        key: keyId,
        amount: amountInPaise,
        currency: "INR",
        name: "SkillNest Services",
        description: `Booking payment for ${serviceName}`,
        image: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        prefill: {
          name: user?.name || "SkillNest Customer",
          email: user?.email || "customer@skillnest.com",
          contact: user?.phone || "9876543210"
        },
        notes: {
          booking_id: booking?.booking_id || "",
          service: serviceName
        },
        theme: {
          color: "#c98e1b"
        },
        handler: function (response) {
          if (onSuccess) {
            onSuccess(response);
          }
        },
        modal: {
          ondismiss: function () {
            if (onDismiss) onDismiss();
          }
        }
      };

      const rzp = new window.Razorpay(rzpOptions);
      rzp.on("payment.failed", function (resp) {
        console.error("Razorpay payment failed:", resp.error);
        if (onError) onError(resp.error?.description || "Payment failed at gateway.");
      });

      rzp.open();
      return true;
    } catch (err) {
      console.warn("Razorpay launch error, falling back:", err);
    }
  }

  // Fallback if Razorpay SDK encounters environment restrictions
  return false;
}
