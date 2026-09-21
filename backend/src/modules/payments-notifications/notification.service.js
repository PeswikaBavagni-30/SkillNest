const supabase = require("../../config/supabase");

/**
 * Notification Service
 * Encapsulates notification creation and event dispatching.
 */
class NotificationService {
  /**
   * Insert a notification record into Supabase
   * @param {Object} params
   * @param {string} params.userId - UUID of the recipient user
   * @param {string} params.title - Notification title
   * @param {string} params.message - Notification body text
   * @returns {Promise<Object>} Created notification record
   */
  async createNotification({ userId, title, message }) {
    if (!userId || !title || !message) {
      console.warn("Notification skipped: Missing required parameters", { userId, title });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title: title.trim(),
          message: message.trim(),
          is_read: false
        })
        .select()
        .single();

      if (error) {
        console.error("Failed to insert notification:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Error creating notification:", err);
      return null;
    }
  }

  /**
   * Dispatch notification when a customer creates a new booking
   * Recipient: Provider
   */
  async notifyNewBooking({ providerId, serviceName, bookingDate, bookingTime, customerName }) {
    return this.createNotification({
      userId: providerId,
      title: "New Booking Request",
      message: `You have received a new booking for "${serviceName}" from ${customerName || "a customer"} on ${bookingDate} at ${bookingTime}.`
    });
  }

  /**
   * Dispatch notification when a provider accepts a booking
   * Recipient: Customer
   */
  async notifyBookingAccepted({ customerId, serviceName, bookingDate, providerName }) {
    return this.createNotification({
      userId: customerId,
      title: "Booking Accepted",
      message: `Great news! Your booking for "${serviceName}" on ${bookingDate} has been accepted by ${providerName || "the service provider"}. Please proceed to payment.`
    });
  }

  /**
   * Dispatch notification when a service booking is completed
   * Recipient: Customer
   */
  async notifyBookingCompleted({ customerId, serviceName, providerName }) {
    return this.createNotification({
      userId: customerId,
      title: "Booking Completed",
      message: `Your service "${serviceName}" has been marked as completed by ${providerName || "the provider"}. Thank you for using SkillNest!`
    });
  }

  /**
   * Dispatch notifications when payment is successful
   * Recipients: Customer (receipt) & Provider (earning confirmation)
   */
  async notifyPaymentSuccess({ customerId, providerId, serviceName, amount, transactionId }) {
    const formattedAmount = Number(amount).toFixed(2);

    // Customer Notification
    const customerPromise = this.createNotification({
      userId: customerId,
      title: "Payment Successful",
      message: `Your payment of ₹${formattedAmount} for "${serviceName}" was successful. (Txn ID: ${transactionId}).`
    });

    // Provider Notification
    let providerPromise = Promise.resolve(null);
    if (providerId) {
      providerPromise = this.createNotification({
        userId: providerId,
        title: "Payment Received",
        message: `Customer payment of ₹${formattedAmount} for "${serviceName}" has been successfully completed. (Txn ID: ${transactionId}).`
      });
    }

    return Promise.all([customerPromise, providerPromise]);
  }
}

module.exports = new NotificationService();
