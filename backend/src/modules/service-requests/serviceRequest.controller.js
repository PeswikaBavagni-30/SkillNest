const serviceRequestService = require("./serviceRequest.service");
const supabase = require("../../config/supabase");

/**
 * POST /api/service-requests
 * Customer creates a custom service request
 */
const createServiceRequest = async (req, res) => {
  try {
    const customerId = req.user.id;
    const customerName = req.user.name || req.user.email;
    const { title, category, category_id, description, deadline, preferred_date, location, city, state, pincode, area } = req.body;
    const budget = req.body.budget !== undefined ? req.body.budget : req.body.budget_max;

    const request = await serviceRequestService.createRequest({
      customerId,
      customerName,
      title,
      category,
      categoryId: category_id,
      description,
      budget,
      deadline,
      preferredDate: preferred_date,
      location,
      city,
      state,
      pincode,
      area
    });

    return res.status(201).json({
      success: true,
      message: "Custom service request posted successfully! Providers will review and submit quotes.",
      request
    });
  } catch (err) {
    console.error("createServiceRequest error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to create custom service request."
    });
  }
};

/**
 * GET /api/service-requests
 * Filter by customer, status, or category
 */
const getServiceRequests = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || "CUSTOMER";
    const { my_requests, status, category } = req.query;

    let customerId = null;
    let providerId = null;

    if (my_requests === "true") {
      customerId = userId;
    } else if (userRole === "PROVIDER") {
      providerId = userId;
    } else if (userRole === "ADMIN") {
      customerId = null;
    } else {
      if (!status) customerId = userId;
    }

    const requests = await serviceRequestService.getRequests({
      customerId,
      status,
      category,
      providerId
    });

    return res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (err) {
    console.error("getServiceRequests error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch custom service requests.",
      error: err.message
    });
  }
};

/**
 * GET /api/service-requests/:id
 */
const getServiceRequestById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const request = await serviceRequestService.getRequestById(id, userId);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Custom service request not found."
      });
    }

    return res.json({
      success: true,
      request
    });
  } catch (err) {
    console.error("getServiceRequestById error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching request details.",
      error: err.message
    });
  }
};

/**
 * PUT /api/service-requests/:id
 */
const updateServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;

    const updated = await serviceRequestService.updateRequest(id, req.body, customerId);

    return res.json({
      success: true,
      message: "Custom request updated successfully!",
      request: updated
    });
  } catch (err) {
    console.error("updateServiceRequest error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to update custom request."
    });
  }
};

/**
 * DELETE /api/service-requests/:id
 */
const deleteServiceRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    await serviceRequestService.deleteRequest(id, customerId, isAdmin);

    return res.json({
      success: true,
      message: "Custom request deleted successfully."
    });
  } catch (err) {
    console.error("deleteServiceRequest error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to delete custom request."
    });
  }
};

/**
 * POST /api/service-requests/:id/responses
 * Provider submits a proposal/quote
 */
const addRequestResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.user.id;
    const providerName = req.user.name || "SkillNest Partner";
    const isVerified = Boolean(req.user.is_verified);
    const quoteAmount = req.body.quote_amount !== undefined ? req.body.quote_amount : req.body.quote_price;
    const message = req.body.message || req.body.proposal_message;
    const estimatedDays = req.body.estimated_days !== undefined ? req.body.estimated_days : req.body.turnaround_days;

    if (!quoteAmount || isNaN(Number(quoteAmount)) || Number(quoteAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid positive quote amount in ₹ is required."
      });
    }

    const response = await serviceRequestService.addResponse({
      requestId: id,
      providerId,
      providerName,
      isVerified,
      quoteAmount: Number(quoteAmount),
      message,
      estimatedDays: estimatedDays
    });

    return res.status(201).json({
      success: true,
      message: "Your quote proposal was submitted successfully!",
      response
    });
  } catch (err) {
    console.error("addRequestResponse error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to submit quote."
    });
  }
};

/**
 * GET /api/service-requests/:id/responses
 */
const getRequestResponses = async (req, res) => {
  try {
    const { id } = req.params;
    const request = await serviceRequestService.getRequestById(id);
    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found."
      });
    }

    return res.json({
      success: true,
      count: request.responses?.length || 0,
      responses: request.responses || []
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve responses."
    });
  }
};

/**
 * POST /api/service-requests/:id/accept
 * Customer accepts a provider quote
 */
const acceptRequestQuote = async (req, res) => {
  try {
    const { id } = req.params;
    const customerId = req.user.id;
    const { response_id } = req.body;

    if (!response_id) {
      return res.status(400).json({
        success: false,
        message: "response_id is required to accept a quote."
      });
    }

    const result = await serviceRequestService.acceptResponse({
      requestId: id,
      responseId: response_id,
      customerId
    });

    return res.json({
      success: true,
      message: "Quote accepted! Booking created in your bookings dashboard.",
      result,
      request: result.request,
      booking: result.booking,
      booking_id: result.booking?.booking_id || result.request?.booking_id
    });
  } catch (err) {
    console.error("acceptRequestQuote error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to accept quote."
    });
  }
};

module.exports = {
  createServiceRequest,
  getServiceRequests,
  getServiceRequestById,
  updateServiceRequest,
  deleteServiceRequest,
  addRequestResponse,
  getRequestResponses,
  acceptRequestQuote
};
