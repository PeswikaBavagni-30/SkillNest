const express = require("express");
const router = express.Router();
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllAsRead
} = require("./notification.controller");
const { authenticateToken } = require("../../middleware/authMiddleware");

// All notification routes require valid authentication
router.use(authenticateToken);

// GET /api/notifications - List user's notifications
router.get("/", getUserNotifications);

// PUT /api/notifications/read-all - Mark all as read
router.put("/read-all", markAllAsRead);

// PUT /api/notifications/:id/read - Mark single notification as read
router.put("/:id/read", markNotificationAsRead);

module.exports = router;
