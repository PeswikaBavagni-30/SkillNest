const express = require("express");
const router = express.Router();
const {
  createOrProcessPayment,
  getPaymentByBooking,
  getPaymentHistory
} = require("./payment.controller");
const { authenticateToken } = require("../../middleware/authMiddleware");

// All payment routes require valid authentication
router.use(authenticateToken);

// POST /api/payments - Initialize or process mock payment
router.post("/", createOrProcessPayment);

// GET /api/payments - View payment history for current user
router.get("/", getPaymentHistory);

// GET /api/payments/:bookingId - View payment record for specific booking
router.get("/:bookingId", getPaymentByBooking);

module.exports = router;
