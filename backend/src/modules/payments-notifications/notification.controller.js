const supabase = require("../../config/supabase");

// Helper to validate UUID format
const isValidUUID = (uuid) => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
};

/**
 * Get Notifications for Authenticated User
 * GET /api/notifications
 */
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user's notifications ordered by created_at DESC
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notifications:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch notifications: " + error.message
      });
    }

    const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

    return res.json({
      success: true,
      count: (notifications || []).length,
      unread_count: unreadCount,
      notifications: notifications || []
    });
  } catch (err) {
    console.error("getUserNotifications error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching notifications."
    });
  }
};

/**
 * Mark a Single Notification as Read
 * PUT /api/notifications/:id/read
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!isValidUUID(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID format. Must be a valid UUID."
      });
    }

    // Lookup notification and verify ownership
    const { data: notification, error: findError } = await supabase
      .from("notifications")
      .select("*")
      .eq("notification_id", id)
      .single();

    if (findError || !notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found."
      });
    }

    if (notification.user_id !== userId && req.user.role !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied: You can only modify your own notifications."
      });
    }

    // Update is_read
    const { data: updated, error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("notification_id", id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: "Failed to update notification: " + updateError.message
      });
    }

    return res.json({
      success: true,
      message: "Notification marked as read.",
      notification: updated
    });
  } catch (err) {
    console.error("markNotificationAsRead error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error updating notification."
    });
  }
};

/**
 * Mark All Notifications as Read for Current User
 * PUT /api/notifications/read-all
 */
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false)
      .select();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to mark notifications as read: " + error.message
      });
    }

    return res.json({
      success: true,
      message: "All notifications marked as read.",
      updated_count: (data || []).length
    });
  } catch (err) {
    console.error("markAllAsRead error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error marking all notifications as read."
    });
  }
};

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead
};
