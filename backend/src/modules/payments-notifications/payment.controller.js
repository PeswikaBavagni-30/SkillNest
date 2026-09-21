const supabase = require("../../config/supabase");
const paymentService = require("./payment.service");

// Helper to validate UUID format
const isValidUUID = (uuid) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
};

/**
 * Initialize or Process a Payment
 * POST /api/payments
 * Body: { booking_id, amount, payment_method, simulate_status }
 */
const createOrProcessPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { booking_id, amount, payment_method = "mock_payment", simulate_status = "PENDING" } = req.body;

    // 1. Validate booking_id presence
    if (!booking_id) {
      return res.status(400).json({
        success: false,
        message: "booking_id is required."
      });
    }

    // 2. Validate UUID format
    if (!isValidUUID(booking_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking_id format. Must be a valid UUID."
      });
    }

    // 3. Validate status
    if (simulate_status && !paymentService.isValidStatus(simulate_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status '${simulate_status}'. Must be one of: ${paymentService.VALID_PAYMENT_STATUSES.join(", ")}`
      });
    }

    // 4. Retrieve booking with service details
    const { data: booking, error: bookingErr } = await supabase
      .from("bookings")
      .select("*, services(*)")
      .eq("booking_id", booking_id)
      .single();

    if (bookingErr || !booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found."
      });
    }

    // 5. Verify ownership: Only the customer who made the booking or an ADMIN can pay
    const isCustomer = booking.customer_id === userId;
    const isAdmin = userRole === "ADMIN";

    if (!isCustomer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only make payments for your own bookings."
      });
    }

    // 6. Process or simulate payment
    const paymentRecord = await paymentService.processPayment({
      booking,
      amount,
      paymentMethod: payment_method,
      simulateStatus: simulate_status,
      user: req.user
    });

    const statusMessage = simulate_status.toUpperCase() === "SUCCESS"
      ? "Payment processed successfully (Mock Test Gateway)"
      : simulate_status.toUpperCase() === "FAILED"
      ? "Payment simulation failed as requested"
      : `Payment status set to ${simulate_status.toUpperCase()}`;

    return res.status(201).json({
      success: true,
      message: statusMessage,
      payment: paymentRecord
    });
  } catch (err) {
    console.error("createOrProcessPayment error:", err);
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || "Failed to process payment."
    });
  }
};

/**
 * Get Payment Details for a Specific Booking
 * GET /api/payments/:bookingId
 */
const getPaymentByBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!isValidUUID(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid bookingId format. Must be a valid UUID."
      });
    }

    // Fetch booking to verify permissions
    const { data: booking, error: bError } = await supabase
      .from("bookings")
      .select("booking_id, customer_id, services(provider_id, service_name)")
      .eq("booking_id", bookingId)
      .single();

    if (bError || !booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found."
      });
    }

    const isCustomer = booking.customer_id === userId;
    const isProvider = booking.services?.provider_id === userId;
    const isAdmin = userRole === "ADMIN";

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not authorized to view this payment information."
      });
    }

    // Fetch payment record
    const { data: payment, error: pError } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (pError) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch payment: " + pError.message
      });
    }

    return res.json({
      success: true,
      payment: payment || null
    });
  } catch (err) {
    console.error("getPaymentByBooking error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching payment."
    });
  }
};

/**
 * Get Payment History for Authenticated User
 * GET /api/payments
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let payments = [];

    if (userRole === "CUSTOMER") {
      // Find all booking IDs belonging to this customer
      const { data: myBookings, error: bErr } = await supabase
        .from("bookings")
        .select("booking_id, service_id, booking_date, total_amount, status, services(service_name, provider_id)")
        .eq("customer_id", userId);

      if (bErr) throw bErr;

      const bookingMap = (myBookings || []).reduce((acc, b) => {
        acc[b.booking_id] = b;
        return acc;
      }, {});

      const bookingIds = Object.keys(bookingMap);

      if (bookingIds.length > 0) {
        const { data: pData, error: pErr } = await supabase
          .from("payments")
          .select("*")
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: false });

        if (pErr) throw pErr;

        payments = (pData || []).map((p) => ({
          ...p,
          booking: bookingMap[p.booking_id] || null
        }));
      }
    } else if (userRole === "PROVIDER") {
      // Find all services by provider
      const { data: services, error: sErr } = await supabase
        .from("services")
        .select("service_id, service_name")
        .eq("provider_id", userId);

      if (sErr) throw sErr;
      const serviceIds = (services || []).map((s) => s.service_id);

      if (serviceIds.length > 0) {
        const { data: bookings, error: bErr } = await supabase
          .from("bookings")
          .select("booking_id, service_id, customer_id, booking_date, total_amount, status, services(service_name)")
          .in("service_id", serviceIds);

        if (bErr) throw bErr;

        const bookingMap = (bookings || []).reduce((acc, b) => {
          acc[b.booking_id] = b;
          return acc;
        }, {});

        const bookingIds = Object.keys(bookingMap);

        if (bookingIds.length > 0) {
          const { data: pData, error: pErr } = await supabase
            .from("payments")
            .select("*")
            .in("booking_id", bookingIds)
            .order("created_at", { ascending: false });

          if (pErr) throw pErr;

          payments = (pData || []).map((p) => ({
            ...p,
            booking: bookingMap[p.booking_id] || null
          }));
        }
      }
    } else {
      // ADMIN: Fetch all payments
      const { data: pData, error: pErr } = await supabase
        .from("payments")
        .select("*, bookings(booking_id, customer_id, booking_date, status, services(service_name))")
        .order("created_at", { ascending: false });

      if (pErr) throw pErr;
      payments = pData || [];
    }

    return res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (err) {
    console.error("getPaymentHistory error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching payment history.",
      error: err.message
    });
  }
};

module.exports = {
  createOrProcessPayment,
  getPaymentByBooking,
  getPaymentHistory
};
