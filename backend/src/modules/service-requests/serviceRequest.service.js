const fs = require("fs");
const path = require("path");
const supabase = require("../../config/supabase");
const notificationService = require("../payments-notifications/notification.service");
const locationService = require("../location/location.service");

const DATA_DIR = path.resolve(__dirname, "../../../data");
const REQUESTS_FILE = path.join(DATA_DIR, "service_requests.json");
const RESPONSES_FILE = path.join(DATA_DIR, "request_responses.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(REQUESTS_FILE)) {
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(RESPONSES_FILE)) {
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify([]));
}

function readRequests() {
  try {
    return JSON.parse(fs.readFileSync(REQUESTS_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeRequests(data) {
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify(data, null, 2));
}

function readResponses() {
  try {
    return JSON.parse(fs.readFileSync(RESPONSES_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeResponses(data) {
  fs.writeFileSync(RESPONSES_FILE, JSON.stringify(data, null, 2));
}

class ServiceRequestService {
  /**
   * Customer creates a new custom service request
   */
  async createRequest({
    customerId,
    customerName,
    title,
    category,
    categoryId,
    description,
    budget,
    deadline,
    preferredDate,
    location,
    city,
    state,
    pincode,
    area
  }) {
    if (!customerId || !title || !description) {
      throw new Error("Title, description, and customer ID are required.");
    }

    const trimmedCity = city ? city.trim() : "";
    const trimmedState = state ? state.trim() : "";
    const trimmedPincode = pincode ? pincode.trim() : "";
    const trimmedArea = area ? area.trim() : "";

    let finalLocation = location?.trim();
    if (!finalLocation && (trimmedCity || trimmedArea)) {
      finalLocation = [trimmedArea, trimmedCity, trimmedState ? `${trimmedState} - ${trimmedPincode}` : trimmedPincode]
        .filter(Boolean)
        .join(", ");
    }
    if (!finalLocation) finalLocation = "Local Service Area";

    const requests = readRequests();
    const now = new Date().toISOString();
    const newRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      customer_id: customerId,
      customer_name: customerName || "Customer",
      title: title.trim(),
      category: category || "General Service",
      category_id: categoryId || null,
      description: description.trim(),
      budget: Number(budget) || 0,
      budget_max: Number(budget) || 0,
      deadline: deadline || null,
      preferred_date: preferredDate || deadline || null,
      location: finalLocation,
      city: trimmedCity,
      state: trimmedState,
      pincode: trimmedPincode,
      area: trimmedArea,
      status: "open", // open, responded, accepted, closed, cancelled
      created_at: now,
      updated_at: now
    };

    requests.unshift(newRequest);
    writeRequests(requests);

    return newRequest;
  }

  /**
   * List custom service requests with optional filters
   */
  async getRequests({ customerId, status, category, providerId }) {
    const requests = readRequests();
    const responses = readResponses();

    let filtered = requests;

    if (customerId) {
      filtered = filtered.filter((r) => r.customer_id === customerId);
    } else if (status) {
      filtered = filtered.filter((r) => r.status.toLowerCase() === status.toLowerCase());
    } else {
      // By default for providers browsing, show open and responded
      filtered = filtered.filter((r) => ["open", "responded", "OPEN", "RESPONDED"].includes(r.status));
    }

    if (category) {
      filtered = filtered.filter((r) => r.category.toLowerCase().includes(category.toLowerCase()));
    }

    // FEATURE 1: Location-Aware Custom Service Requests
    // If provider has configured location/service areas, filter out requests from outside their service area
    if (providerId && !customerId) {
      const provLoc = await locationService.getUserLocation(providerId);
      const provAreas = await locationService.getProviderServiceAreas(providerId);
      const hasConfiguredLocation = (provLoc && provLoc.city && provLoc.city.trim()) || (provAreas && provAreas.length > 0);

      if (hasConfiguredLocation) {
        const providerCheckResults = await Promise.all(
          filtered.map(async (r) => {
            if (!r.city || !r.city.trim()) return { req: r, canServe: true };
            const canServe = await locationService.isProviderServingLocation(providerId, {
              city: r.city,
              state: r.state,
              pincode: r.pincode,
              address: r.location
            });
            return { req: r, canServe };
          })
        );
        filtered = providerCheckResults.filter((p) => p.canServe).map((p) => p.req);
      }
    }

    // Attach response summary and whether provider already responded
    return filtered.map((req) => {
      const reqResponses = responses.filter((res) => res.request_id === req.id);
      const hasProviderResponded = providerId ? reqResponses.some((res) => res.provider_id === providerId) : false;

      return {
        ...req,
        budget_max: req.budget_max || req.budget,
        responses_count: reqResponses.length,
        has_responded: hasProviderResponded,
        responses: reqResponses
      };
    });
  }

  /**
   * Get single request details by ID
   */
  async getRequestById(requestId, requestingUserId = null) {
    const requests = readRequests();
    const request = requests.find((r) => r.id === requestId);
    if (!request) {
      return null;
    }

    const responses = readResponses().filter((res) => res.request_id === requestId);

    return {
      ...request,
      responses_count: responses.length,
      responses: responses
    };
  }

  /**
   * Update or cancel custom service request
   */
  async updateRequest(requestId, updates, customerId) {
    const requests = readRequests();
    const index = requests.findIndex((r) => r.id === requestId);
    if (index === -1) {
      throw new Error("Custom service request not found.");
    }

    const req = requests[index];
    if (req.customer_id !== customerId) {
      throw new Error("Unauthorized. You can only edit your own custom requests.");
    }

    if (["ACCEPTED", "CLOSED"].includes(req.status)) {
      throw new Error("Cannot edit a request that has already been accepted or closed.");
    }

    const allowed = ["title", "category", "category_id", "description", "budget", "deadline", "preferred_date", "location", "status"];
    allowed.forEach((field) => {
      if (updates[field] !== undefined) {
        req[field] = updates[field];
      }
    });
    req.updated_at = new Date().toISOString();

    requests[index] = req;
    writeRequests(requests);
    return req;
  }

  /**
   * Delete custom request
   */
  async deleteRequest(requestId, customerId, isAdmin = false) {
    const requests = readRequests();
    const index = requests.findIndex((r) => r.id === requestId);
    if (index === -1) {
      throw new Error("Custom request not found.");
    }

    const req = requests[index];
    if (req.customer_id !== customerId && !isAdmin) {
      throw new Error("Unauthorized. You can only delete your own custom requests.");
    }

    requests.splice(index, 1);
    writeRequests(requests);

    // Also clean up responses
    const responses = readResponses().filter((res) => res.request_id !== requestId);
    writeResponses(responses);

    return { success: true };
  }

  /**
   * Provider submits a quote/response to an open custom service request
   */
  async addResponse({
    requestId,
    providerId,
    providerName,
    isVerified = false,
    quoteAmount,
    message,
    estimatedDays
  }) {
    const requests = readRequests();
    const request = requests.find((r) => r.id === requestId);

    if (!request) {
      throw new Error("Custom service request not found.");
    }
    if (request.status.toLowerCase() !== "open" && request.status.toLowerCase() !== "responded") {
      throw new Error("This service request is no longer accepting proposals.");
    }
    if (request.customer_id === providerId) {
      throw new Error("You cannot submit a quote for your own custom request.");
    }

    const responses = readResponses();
    const existingIndex = responses.findIndex(
      (res) => res.request_id === requestId && res.provider_id === providerId
    );

    const now = new Date().toISOString();
    const responsePayload = {
      id: existingIndex >= 0 ? responses[existingIndex].id : `resp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      request_id: requestId,
      provider_id: providerId,
      provider_name: providerName || "SkillNest Partner",
      provider_verified: Boolean(isVerified),
      quote_amount: Number(quoteAmount) || 0,
      quote_price: Number(quoteAmount) || 0,
      message: (message || "").trim(),
      proposal_message: (message || "").trim(),
      estimated_days: estimatedDays ? Number(estimatedDays) : 3,
      turnaround_days: estimatedDays ? Number(estimatedDays) : 3,
      status: "pending",
      created_at: existingIndex >= 0 ? responses[existingIndex].created_at : now,
      updated_at: now
    };

    if (existingIndex >= 0) {
      responses[existingIndex] = responsePayload;
    } else {
      responses.unshift(responsePayload);
    }
    writeResponses(responses);

    // Mark request as responded
    if (request.status.toLowerCase() === "open") {
      request.status = "responded";
      request.updated_at = now;
      writeRequests(requests);
    }

    // Send in-app notification to the Customer
    try {
      await notificationService.createNotification({
        userId: request.customer_id,
        title: "New Quote on Custom Request",
        message: `${providerName || "A provider"} quoted ₹${quoteAmount} for "${request.title}": "${message.substring(0, 80)}..."`
      });
    } catch (notifErr) {
      console.warn("Failed to notify customer of quote:", notifErr);
    }

    return responsePayload;
  }

  /**
   * Customer accepts a provider's quote:
   * 1. Updates response status to ACCEPTED
   * 2. Updates request status to ACCEPTED
   * 3. Integrates with existing Member 3 BOOKINGS table
   * 4. Sends in-app notifications to both customer and provider
   */
  async acceptResponse({ requestId, responseId, customerId }) {
    const requests = readRequests();
    const request = requests.find((r) => r.id === requestId);

    if (!request) {
      throw new Error("Custom service request not found.");
    }
    if (request.customer_id !== customerId) {
      throw new Error("Unauthorized. Only the request owner can accept quotes.");
    }
    if (request.status.toLowerCase() === "accepted") {
      throw new Error("This request has already been accepted.");
    }

    const responses = readResponses();
    const targetResponse = responses.find((res) => res.id === responseId && res.request_id === requestId);

    if (!targetResponse) {
      throw new Error("Quote response not found for this request.");
    }

    const now = new Date().toISOString();

    // Mark target response accepted, others declined
    responses.forEach((res) => {
      if (res.request_id === requestId) {
        res.status = res.id === responseId ? "accepted" : "declined";
        res.updated_at = now;
      }
    });
    writeResponses(responses);

    // Mark request accepted
    request.status = "accepted";
    request.accepted_response_id = responseId;
    request.accepted_provider_id = targetResponse.provider_id;
    request.accepted_quote_amount = targetResponse.quote_amount || targetResponse.quote_price;
    request.updated_at = now;
    writeRequests(requests);

    // Integrate with Member 3 BOOKINGS table:
    // 1. Check if provider has an existing service in this category, or any service
    let serviceId = null;
    const { data: providerServices } = await supabase
      .from("services")
      .select("service_id")
      .eq("provider_id", targetResponse.provider_id)
      .limit(1);

    if (providerServices && providerServices.length > 0) {
      serviceId = providerServices[0].service_id;
    } else {
      // Fetch default category or first category
      const { data: cats } = await supabase.from("service_categories").select("category_id").limit(1);
      const catId = cats && cats.length > 0 ? cats[0].category_id : request.category_id;

      // Create a service record for this custom booking
      const { data: newSrv } = await supabase
        .from("services")
        .insert({
          provider_id: targetResponse.provider_id,
          category_id: catId,
          service_name: `Custom: ${request.title}`,
          description: request.description,
          price: targetResponse.quote_amount,
          duration_minutes: 120,
          location: request.location || "On-site",
          availability: true
        })
        .select("service_id")
        .single();

      if (newSrv) {
        serviceId = newSrv.service_id;
      }
    }

    if (!serviceId) {
      // Fallback: pick any existing service to satisfy FK constraint if needed
      const { data: anySrv } = await supabase.from("services").select("service_id").limit(1);
      serviceId = anySrv && anySrv.length > 0 ? anySrv[0].service_id : null;
    }

    // Insert into Supabase bookings table
    let createdBooking = null;
    if (serviceId) {
      const bookingDate = request.preferred_date || request.deadline || new Date(Date.now() + 86400000).toISOString().split("T")[0];
      const { data: bookingData, error: bookingErr } = await supabase
        .from("bookings")
        .insert({
          customer_id: customerId,
          service_id: serviceId,
          booking_date: bookingDate,
          booking_time: "10:00 AM",
          address: request.location || "Customer Location",
          total_amount: targetResponse.quote_amount,
          status: "accepted" // Automatically accepted upon agreement
        })
        .select()
        .single();

      if (!bookingErr && bookingData) {
        createdBooking = bookingData;
        request.booking_id = bookingData.booking_id;
        writeRequests(requests);
      } else {
        console.error("Failed to insert booking for custom request:", bookingErr);
      }
    }

    // Send notifications to both parties
    try {
      // Provider notification
      await notificationService.createNotification({
        userId: targetResponse.provider_id,
        title: "Quote Accepted!",
        message: `Your quote of ₹${targetResponse.quote_amount} for "${request.title}" was accepted! A new confirmed booking has been created.`
      });

      // Customer notification
      await notificationService.createNotification({
        userId: customerId,
        title: "Custom Request Confirmed",
        message: `You accepted ${targetResponse.provider_name}'s quote of ₹${targetResponse.quote_amount} for "${request.title}". You can manage and pay in My Bookings.`
      });
    } catch (notifErr) {
      console.warn("Notification error on accepting custom request quote:", notifErr);
    }

    return {
      request,
      accepted_response: targetResponse,
      booking: createdBooking
    };
  }
}

module.exports = new ServiceRequestService();
