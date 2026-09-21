const supabase = require("../../config/supabase");
const notificationService = require("./notification.service");

/**
 * Valid payment statuses allowed in SkillNest
 */
const VALID_PAYMENT_STATUSES = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"];

/**
 * Mock Payment Gateway Adapter
 * Designed following the Gateway Adapter pattern so a production payment
 * gateway (e.g. Stripe, Razorpay, or PayPal) can be plugged in later with zero
 * changes to the controller or caller code.
 */
class MockPaymentGatewayAdapter {
  /**
   * Generate a unique mock transaction ID
   */
  generateTransactionId() {
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `txn_mock_${timestamp}_${randomHex}`;
  }

  /**
   * Process a simulated transaction
   * @param {Object} options
   * @param {number} options.amount
   * @param {string} [options.simulateStatus='SUCCESS']
   * @returns {Promise<Object>}
   */
  async executeTransaction({ amount, simulateStatus = "SUCCESS" }) {
    const status = simulateStatus.toUpperCase();

    if (!VALID_PAYMENT_STATUSES.includes(status)) {
      throw new Error(
        `Invalid payment status '${simulateStatus}'. Allowed statuses: ${VALID_PAYMENT_STATUSES.join(", ")}`
      );
    }

    const transactionId = this.generateTransactionId();

    return {
      gateway: "MOCK_TEST_GATEWAY",
      transactionId,
      amount: Number(amount),
      status: status.toLowerCase(), // Store normalized in database
      timestamp: new Date().toISOString()
    };
  }
}

class PaymentService {
  constructor() {
    this.gateway = new MockPaymentGatewayAdapter();
  }

  /**
   * Validate if a status string is valid
   * @param {string} status
   * @returns {boolean}
   */
  isValidStatus(status) {
    if (!status || typeof status !== "string") return false;
    return VALID_PAYMENT_STATUSES.includes(status.toUpperCase().trim());
  }

  /**
   * Create or update payment for a booking
   * Flow:
   * 1. Check existing payment row for this booking
   * 2. If status is PENDING, initialize or keep pending
   * 3. If simulateStatus is SUCCESS/FAILED/REFUNDED, transition status
   * 4. If SUCCESS, trigger notifications to customer and provider
   */
  async processPayment({ booking, amount, paymentMethod = "mock_payment", simulateStatus = "PENDING", user }) {
    const normalizedStatus = (simulateStatus || "PENDING").toUpperCase().trim();

    if (!this.isValidStatus(normalizedStatus)) {
      const err = new Error(
        `Invalid payment status '${simulateStatus}'. Must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}`
      );
      err.statusCode = 400;
      throw err;
    }

    const paymentAmount = amount !== undefined && amount !== null
      ? Number(amount)
      : Number(booking.total_amount);

    if (isNaN(paymentAmount) || paymentAmount < 0) {
      const err = new Error("Payment amount must be a positive number.");
      err.statusCode = 400;
      throw err;
    }

    // Check if a payment record already exists for this booking
    const { data: existingPayment, error: findError } = await supabase
      .from("payments")
      .select("*")
      .eq("booking_id", booking.booking_id)
      .maybeSingle();

    if (findError) {
      console.error("Error looking up existing payment:", findError);
      throw new Error("Failed to check existing payment record.");
    }

    // Execute through gateway adapter
    const gatewayResult = await this.gateway.executeTransaction({
      amount: paymentAmount,
      simulateStatus: normalizedStatus
    });

    const isSuccess = normalizedStatus === "SUCCESS";
    const paymentDate = normalizedStatus === "PENDING" ? null : gatewayResult.timestamp;
    const dbStatus = normalizedStatus.toLowerCase();
    // Database schema uses payment_method ENUM ('razorpay')
    const dbMethod = "razorpay";

    let paymentRecord = null;

    if (existingPayment) {
      // Update existing payment record
      const updatePayload = {
        amount: paymentAmount,
        payment_method: dbMethod,
        transaction_id: gatewayResult.transactionId,
        payment_status: dbStatus,
        payment_date: paymentDate
      };

      const { data: updated, error: updateError } = await supabase
        .from("payments")
        .update(updatePayload)
        .eq("payment_id", existingPayment.payment_id)
        .select()
        .single();

      if (updateError) {
        console.error("Payment update error:", updateError);
        throw new Error("Failed to update payment record: " + updateError.message);
      }
      paymentRecord = updated;
    } else {
      // Create new payment record
      const insertPayload = {
        booking_id: booking.booking_id,
        amount: paymentAmount,
        payment_method: dbMethod,
        transaction_id: gatewayResult.transactionId,
        payment_status: dbStatus,
        payment_date: paymentDate
      };

      const { data: created, error: insertError } = await supabase
        .from("payments")
        .insert(insertPayload)
        .select()
        .single();

      if (insertError) {
        console.error("Payment insertion error:", insertError);
        throw new Error("Failed to create payment record: " + insertError.message);
      }
      paymentRecord = created;
    }

    // If payment was SUCCESSFUL, dispatch notifications to customer & provider
    if (isSuccess) {
      const serviceName = booking.services?.service_name || "SkillNest Service";
      const providerId = booking.services?.provider_id;

      await notificationService.notifyPaymentSuccess({
        customerId: booking.customer_id,
        providerId: providerId,
        serviceName: serviceName,
        amount: paymentAmount,
        transactionId: paymentRecord.transaction_id
      });
    }

    return paymentRecord;
  }
}

module.exports = new PaymentService();
module.exports.VALID_PAYMENT_STATUSES = VALID_PAYMENT_STATUSES;
