const supabase = require("../config/supabase");
const locationService = require("../modules/location/location.service");

/**
 * Helper to attach customer profile details to a list of bookings
 */
const attachCustomerDetails = async (bookings) => {
  if (!bookings || bookings.length === 0) return bookings;

  const customerIds = [...new Set(bookings.map((b) => b.customer_id).filter(Boolean))];
  if (customerIds.length === 0) return bookings;

  const { data: customers } = await supabase
    .from("users")
    .select("user_id, full_name, email, phone, address")
    .in("user_id", customerIds);

  const customerMap = (customers || []).reduce((acc, c) => {
    acc[c.user_id] = c;
    return acc;
  }, {});

  return bookings.map((b) => ({
    ...b,
    customer: customerMap[b.customer_id] || {
      full_name: "Valued Customer",
      phone: b.address ? "Phone on file" : null
    }
  }));
};

/**
 * Helper to attach provider profile details to a list of bookings
 */
const attachProviderDetails = async (bookings) => {
  if (!bookings || bookings.length === 0) return bookings;

  const providerIds = [
    ...new Set(
      bookings
        .map((b) => b.services?.provider_id)
        .filter(Boolean)
    )
  ];
  if (providerIds.length === 0) return bookings;

  const { data: providers } = await supabase
    .from("users")
    .select("user_id, full_name, email, phone")
    .in("user_id", providerIds);

  const providerMap = (providers || []).reduce((acc, p) => {
    acc[p.user_id] = p;
    return acc;
  }, {});

  return bookings.map((b) => ({
    ...b,
    provider: providerMap[b.services?.provider_id] || {
      full_name: "SkillNest Verified Provider"
    }
  }));
};

/**
 * Create a New Booking
 * POST /api/bookings
 * Required: { service_id, booking_date, booking_time, address }
 */
const createBooking = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { service_id, booking_date, booking_time, address, notes } = req.body;

    if (!service_id) {
      return res.status(400).json({
        success: false,
        message: "Service selection is required."
      });
    }

    if (!booking_date) {
      return res.status(400).json({
        success: false,
        message: "Booking date is required."
      });
    }

    if (!booking_time) {
      return res.status(400).json({
        success: false,
        message: "Booking time is required."
      });
    }

    if (!address || !address.trim()) {
      return res.status(400).json({
        success: false,
        message: "Service address is required."
      });
    }

    // Lookup service to verify existence and fetch price
    const { data: service, error: serviceErr } = await supabase
      .from("services")
      .select("*, service_categories(*)")
      .eq("service_id", service_id)
      .single();

    if (serviceErr || !service) {
      return res.status(404).json({
        success: false,
        message: "The requested service could not be found."
      });
    }

    if (!service.availability) {
      return res.status(400).json({
        success: false,
        message: "This service is currently unavailable for new bookings."
      });
    }

    // Check that customer is not booking their own service
    if (service.provider_id === customerId) {
      return res.status(400).json({
        success: false,
        message: "You cannot book your own service."
      });
    }

    // Location-Aware Booking Validation
    let bookingCity = req.body.city ? String(req.body.city).trim() : "";
    const bookingState = req.body.state ? String(req.body.state).trim() : "";
    const bookingPincode = req.body.pincode ? String(req.body.pincode).trim() : "";

    // Fallback: extract city from address if not explicitly passed
    if (!bookingCity && address) {
      const parts = address.split(/[,\-\n]/).map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        if (!/^\d{6}$/.test(part) && part.length > 2 && !["india", "bharat"].includes(part.toLowerCase())) {
          bookingCity = part;
          break;
        }
      }
    }

    const servesRequestedLocation = await locationService.isProviderServingLocation(service.provider_id, {
      city: bookingCity,
      state: bookingState,
      pincode: bookingPincode,
      address: address.trim(),
      serviceLocation: service.location || ""
    });

    if (!servesRequestedLocation) {
      return res.status(400).json({
        success: false,
        message: "This provider does not currently provide services in this location."
      });
    }

    const totalAmount = Number(service.price) || 0;

    const bookingPayload = {
      customer_id: customerId,
      service_id: service.service_id,
      booking_date: booking_date,
      booking_time: booking_time,
      address: address.trim(),
      status: "pending",
      total_amount: totalAmount
    };

    const { data: newBooking, error: bookingErr } = await supabase
      .from("bookings")
      .insert(bookingPayload)
      .select("*, services(*, service_categories(*))")
      .single();

    if (bookingErr) {
      console.error("createBooking error:", bookingErr);
      return res.status(500).json({
        success: false,
        message: "Failed to create booking: " + bookingErr.message
      });
    }

    // Attach provider details for response
    const enriched = await attachProviderDetails([newBooking]);

    // Dispatch notifications to BOTH provider and customer
    try {
      const notificationService = require("../modules/payments-notifications/notification.service");
      
      // Notify Provider of new request
      notificationService.notifyNewBooking({
        providerId: service.provider_id,
        serviceName: service.service_name,
        bookingDate: booking_date,
        bookingTime: booking_time,
        customerName: req.user.name
      }).catch((e) => console.error("notifyNewBooking async error:", e));

      // Notify Customer with immediate confirmation
      notificationService.notifyBookingCreated({
        customerId: customerId,
        serviceName: service.service_name,
        bookingDate: booking_date,
        bookingTime: booking_time,
        totalAmount: totalAmount
      }).catch((e) => console.error("notifyBookingCreated async error:", e));
    } catch (notifErr) {
      console.error("Booking dispatch notification error:", notifErr);
    }

    return res.status(201).json({
      success: true,
      message: "Booking request created successfully!",
      booking: enriched[0]
    });
  } catch (err) {
    console.error("createBooking unexpected error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating booking.",
      error: err.message
    });
  }
};

/**
 * Get Customer's Bookings
 * GET /api/bookings/customer
 */
const getCustomerBookings = async (req, res) => {
  try {
    const customerId = req.user.id;

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*, services(*, service_categories(*))")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getCustomerBookings error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch customer bookings.",
        error: error.message
      });
    }

    const withProviders = await attachProviderDetails(bookings || []);

    return res.json({
      success: true,
      count: withProviders.length,
      bookings: withProviders
    });
  } catch (err) {
    console.error("getCustomerBookings error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching customer bookings.",
      error: err.message
    });
  }
};

/**
 * Get Provider's Bookings (Bookings made for the provider's services)
 * GET /api/bookings/provider
 */
const getProviderBookings = async (req, res) => {
  try {
    const providerId = req.user.id;

    // Step 1: Find all services belonging to this provider
    const { data: myServices, error: sErr } = await supabase
      .from("services")
      .select("service_id")
      .eq("provider_id", providerId);

    if (sErr) {
      return res.status(500).json({
        success: false,
        message: "Failed to locate provider services.",
        error: sErr.message
      });
    }

    const serviceIds = (myServices || []).map((s) => s.service_id);

    if (serviceIds.length === 0) {
      return res.json({
        success: true,
        count: 0,
        bookings: []
      });
    }

    // Step 2: Fetch all bookings for these services
    const { data: bookings, error: bErr } = await supabase
      .from("bookings")
      .select("*, services(*, service_categories(*))")
      .in("service_id", serviceIds)
      .order("created_at", { ascending: false });

    if (bErr) {
      console.error("getProviderBookings error:", bErr);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch provider bookings.",
        error: bErr.message
      });
    }

    // Step 3: Enrich with customer details
    const enriched = await attachCustomerDetails(bookings || []);

    return res.json({
      success: true,
      count: enriched.length,
      bookings: enriched
    });
  } catch (err) {
    console.error("getProviderBookings error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching provider bookings.",
      error: err.message
    });
  }
};

/**
 * Get Single Booking Details
 * GET /api/bookings/:id
 */
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*, services(*, service_categories(*))")
      .eq("booking_id", id)
      .single();

    if (error || !booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found."
      });
    }

    // Verify authorized user (Customer, Service Provider, or Admin)
    const isCustomer = booking.customer_id === userId;
    const isProvider = booking.services?.provider_id === userId;
    const isAdmin = userRole === "ADMIN";

    if (!isCustomer && !isProvider && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not authorized to view this booking."
      });
    }

    const [withCustomer] = await attachCustomerDetails([booking]);
    const [finalEnriched] = await attachProviderDetails([withCustomer]);

    return res.json({
      success: true,
      booking: finalEnriched
    });
  } catch (err) {
    console.error("getBookingById error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching booking details.",
      error: err.message
    });
  }
};

/**
 * Update Booking Status
 * PUT /api/bookings/:id/status
 * Status options: 'pending', 'accepted', 'completed', 'cancelled'
 */
const updateBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "New status is required."
      });
    }

    const normalizedStatus = status.toLowerCase().trim();
    const validStatuses = ["pending", "accepted", "completed", "cancelled"];

    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`
      });
    }

    // Fetch booking to verify permissions
    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*, services(*)")
      .eq("booking_id", id)
      .single();

    if (fetchErr || !booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found."
      });
    }

    const isCustomer = booking.customer_id === userId;
    const isProvider = booking.services?.provider_id === userId;
    const isAdmin = userRole === "ADMIN";

    // Permission checks:
    // - Customer can only cancel their booking
    // - Provider can accept, complete, or cancel
    // - Admin can perform any transition
    if (isCustomer && !isProvider && !isAdmin) {
      if (normalizedStatus !== "cancelled") {
        return res.status(403).json({
          success: false,
          message: "Customers can only cancel a booking."
        });
      }
    } else if (isProvider && !isAdmin) {
      // Provider cannot move booking back to pending once progressed
    } else if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this booking."
      });
    }

    const { data: updatedBooking, error: updateErr } = await supabase
      .from("bookings")
      .update({
        status: normalizedStatus,
        updated_at: new Date().toISOString()
      })
      .eq("booking_id", id)
      .select("*, services(*, service_categories(*))")
      .single();

    if (updateErr) {
      return res.status(500).json({
        success: false,
        message: "Failed to update booking status.",
        error: updateErr.message
      });
    }

    const [withCust] = await attachCustomerDetails([updatedBooking]);
    const [finalEnriched] = await attachProviderDetails([withCust]);

    // Dispatch lifecycle notifications for accepted and completed states
    try {
      const notificationService = require("../modules/payments-notifications/notification.service");
      const serviceName = updatedBooking.services?.service_name || "Service";
      const customerId = updatedBooking.customer_id;
      const providerName = finalEnriched?.provider?.full_name || "SkillNest Partner";

      if (normalizedStatus === "accepted") {
        notificationService.notifyBookingAccepted({
          customerId,
          serviceName,
          bookingDate: updatedBooking.booking_date,
          providerName
        }).catch((e) => console.error("notifyBookingAccepted async error:", e));
      } else if (normalizedStatus === "completed") {
        notificationService.notifyBookingCompleted({
          customerId,
          serviceName,
          providerName
        }).catch((e) => console.error("notifyBookingCompleted async error:", e));
      }
    } catch (notifErr) {
      console.error("Booking lifecycle notification error:", notifErr);
    }

    return res.json({
      success: true,
      message: `Booking status updated to ${normalizedStatus.toUpperCase()} successfully!`,
      booking: finalEnriched
    });
  } catch (err) {
    console.error("updateBookingStatus error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error updating booking status.",
      error: err.message
    });
  }
};

/**
 * Delete / Cancel Booking
 * DELETE /api/bookings/:id
 */
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const { data: booking, error: fetchErr } = await supabase
      .from("bookings")
      .select("*, services(*)")
      .eq("booking_id", id)
      .single();

    if (fetchErr || !booking) {
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
        message: "You are not authorized to delete or cancel this booking."
      });
    }

    // Delete record from bookings table
    const { error: deleteErr } = await supabase
      .from("bookings")
      .delete()
      .eq("booking_id", id);

    if (deleteErr) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete booking: " + deleteErr.message
      });
    }

    return res.json({
      success: true,
      message: "Booking deleted successfully!"
    });
  } catch (err) {
    console.error("deleteBooking error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error deleting booking.",
      error: err.message
    });
  }
};

module.exports = {
  createBooking,
  getCustomerBookings,
  getProviderBookings,
  getBookingById,
  updateBookingStatus,
  deleteBooking
};
