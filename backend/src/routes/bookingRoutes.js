const express = require("express");
const router = express.Router();
const {
  createBooking,
  getCustomerBookings,
  getProviderBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking
} = require("../controllers/bookingController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

// POST /api/bookings - Protected: Customer creates a booking
router.post("/", authenticateToken, requireRole(["CUSTOMER", "ADMIN"]), createBooking);

// GET /api/bookings/customer - Protected: Customer views their bookings
router.get("/customer", authenticateToken, requireRole(["CUSTOMER", "ADMIN"]), getCustomerBookings);

// GET /api/bookings/provider - Protected: Provider views bookings for their services
router.get("/provider", authenticateToken, requireRole(["PROVIDER", "ADMIN"]), getProviderBookings);

// GET /api/bookings/:id - Protected: View specific booking details
router.get("/:id", authenticateToken, getBookingById);

// PUT /api/bookings/:id/status - Protected: Update booking status (PENDING, ACCEPTED, COMPLETED, CANCELLED)
router.put("/:id/status", authenticateToken, updateBookingStatus);

// DELETE /api/bookings/:id - Protected: Cancel / Delete booking
router.delete("/:id", authenticateToken, deleteBooking);

module.exports = router;
