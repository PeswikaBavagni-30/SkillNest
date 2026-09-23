const fs = require("fs");
const path = require("path");
const supabase = require("../config/supabase");
const locationService = require("../modules/location/location.service");

/**
 * Helper to attach provider information to services
 */
const attachProviderInfo = async (services) => {
  if (!services || services.length === 0) return services;
  
  const providerIds = [...new Set(services.map((s) => s.provider_id).filter(Boolean))];
  if (providerIds.length === 0) return services;

  const { data: providers } = await supabase
    .from("users")
    .select("user_id, full_name, email, phone, role, is_verified")
    .in("user_id", providerIds);

  const providerMap = (providers || []).reduce((acc, p) => {
    acc[p.user_id] = p;
    return acc;
  }, {});

  // Fetch location summaries for providers
  const locationSummaries = {};
  await Promise.all(
    providerIds.map(async (pid) => {
      try {
        locationSummaries[pid] = await locationService.getProviderLocationSummary(pid);
      } catch {
        locationSummaries[pid] = null;
      }
    })
  );

  return services.map((s) => {
    const locSummary = locationSummaries[s.provider_id];
    return {
      ...s,
      provider: providerMap[s.provider_id] || {
        full_name: "SkillNest Verified Provider",
        is_verified: true
      },
      provider_location: locSummary?.home || null,
      service_areas: locSummary?.service_areas || [],
      location: s.location && s.location !== "Local Service Area" ? s.location : (locSummary?.display_string || "Local Service Area")
    };
  });
};

/**
 * Get All Services (with optional filters)
 * GET /api/services
 * Query parameters:
 *  - category_id: Filter by category UUID
 *  - search: Search text in title or description
 *  - provider_id: Filter by provider UUID (e.g. My Services)
 */
const getServices = async (req, res) => {
  try {
    const { category_id, search, provider_id, available_only, city, state, pincode } = req.query;

    let query = supabase
      .from("services")
      .select("*, service_categories(*)")
      .order("created_at", { ascending: false });

    if (category_id) {
      query = query.eq("category_id", category_id);
    }

    if (provider_id) {
      query = query.eq("provider_id", provider_id);
    }

    if (available_only === "true") {
      query = query.eq("availability", true);
    }

    if (search && search.trim()) {
      query = query.ilike("service_name", `%${search.trim()}%`);
    }

    const { data: services, error } = await query;

    if (error) {
      console.error("getServices query error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve services.",
        error: error.message
      });
    }

    // Attach provider user info and location
    const enrichedServices = await attachProviderInfo(services || []);

    // Filter by city / state / pincode if specified
    let filteredServices = enrichedServices;
    if (city && city.trim()) {
      const matchChecks = await Promise.all(
        enrichedServices.map(async (s) => {
          const serves = await locationService.isProviderServingLocation(s.provider_id, {
            city: city.trim(),
            state: state ? state.trim() : "",
            pincode: pincode ? pincode.trim() : "",
            serviceLocation: s.location || ""
          });
          return { service: s, serves };
        })
      );
      filteredServices = matchChecks.filter((m) => m.serves).map((m) => m.service);
    }

    return res.json({
      success: true,
      count: filteredServices.length,
      services: filteredServices
    });
  } catch (err) {
    console.error("getServices error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while fetching services.",
      error: err.message
    });
  }
};

/**
 * Get Single Service by ID
 * GET /api/services/:id
 */
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Service ID is required."
      });
    }

    const { data: service, error } = await supabase
      .from("services")
      .select("*, service_categories(*)")
      .eq("service_id", id)
      .single();

    if (error || !service) {
      return res.status(404).json({
        success: false,
        message: "Service not found."
      });
    }

    // Attach provider profile
    const enrichedList = await attachProviderInfo([service]);
    const detailedService = enrichedList[0];

    return res.json({
      success: true,
      service: detailedService
    });
  } catch (err) {
    console.error("getServiceById error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching service details.",
      error: err.message
    });
  }
};

/**
 * Create New Service (Provider Only)
 * POST /api/services
 */
const createService = async (req, res) => {
  try {
    const providerId = req.user.id;
    const {
      service_name,
      category_id,
      description,
      price,
      duration_minutes,
      location,
      availability,
      image_url
    } = req.body;

    // Validate required fields
    if (!service_name || !service_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Service title / name is required."
      });
    }

    if (!category_id) {
      return res.status(400).json({
        success: false,
        message: "Category is required."
      });
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({
        success: false,
        message: "A valid non-negative price is required."
      });
    }

    // Verify category exists
    const { data: category } = await supabase
      .from("service_categories")
      .select("category_id")
      .eq("category_id", category_id)
      .single();

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Selected category does not exist."
      });
    }

    // Default location to provider's configured location summary if not provided
    let finalLocation = location?.trim();
    if (!finalLocation) {
      const locSummary = await locationService.getProviderLocationSummary(providerId);
      finalLocation = locSummary?.display_string || "Local Service Area";
    }

    const newServicePayload = {
      provider_id: providerId,
      category_id: category_id,
      service_name: service_name.trim(),
      description: description?.trim() || "",
      price: Number(price),
      duration_minutes: duration_minutes ? Number(duration_minutes) : 60,
      location: finalLocation,
      availability: availability !== undefined ? Boolean(availability) : true,
      image_url: image_url?.trim() || null
    };

    const { data: createdService, error } = await supabase
      .from("services")
      .insert(newServicePayload)
      .select("*, service_categories(*)")
      .single();

    if (error) {
      console.error("createService insert error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create service.",
        error: error.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "Service added successfully!",
      service: createdService
    });
  } catch (err) {
    console.error("createService error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while adding service.",
      error: err.message
    });
  }
};

/**
 * Update Existing Service (Provider Only - Ownership Checked)
 * PUT /api/services/:id
 */
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check service existence and ownership
    const { data: existingService, error: fetchErr } = await supabase
      .from("services")
      .select("*")
      .eq("service_id", id)
      .single();

    if (fetchErr || !existingService) {
      return res.status(404).json({
        success: false,
        message: "Service not found."
      });
    }

    if (existingService.provider_id !== userId && userRole !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only edit services you created."
      });
    }

    const {
      service_name,
      category_id,
      description,
      price,
      duration_minutes,
      location,
      availability,
      image_url
    } = req.body;

    const updates = {
      updated_at: new Date().toISOString()
    };

    if (service_name !== undefined) updates.service_name = service_name.trim();
    if (category_id !== undefined) updates.category_id = category_id;
    if (description !== undefined) updates.description = description.trim();
    if (price !== undefined) updates.price = Number(price);
    if (duration_minutes !== undefined) updates.duration_minutes = Number(duration_minutes);
    if (location !== undefined) updates.location = location.trim();
    if (availability !== undefined) updates.availability = Boolean(availability);
    if (image_url !== undefined) updates.image_url = image_url.trim();

    const { data: updatedService, error: updateErr } = await supabase
      .from("services")
      .update(updates)
      .eq("service_id", id)
      .select("*, service_categories(*)")
      .single();

    if (updateErr) {
      return res.status(500).json({
        success: false,
        message: "Failed to update service.",
        error: updateErr.message
      });
    }

    return res.json({
      success: true,
      message: "Service updated successfully!",
      service: updatedService
    });
  } catch (err) {
    console.error("updateService error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while updating service.",
      error: err.message
    });
  }
};

/**
 * Delete Service (Provider Only - Ownership Checked)
 * DELETE /api/services/:id
 */
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check service existence and ownership
    const { data: existingService, error: fetchErr } = await supabase
      .from("services")
      .select("*")
      .eq("service_id", id)
      .single();

    if (fetchErr || !existingService) {
      return res.status(404).json({
        success: false,
        message: "Service not found."
      });
    }

    if (existingService.provider_id !== userId && userRole !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete services you created."
      });
    }

    const { error: deleteErr } = await supabase
      .from("services")
      .delete()
      .eq("service_id", id);

    if (deleteErr) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete service.",
        error: deleteErr.message
      });
    }

    return res.json({
      success: true,
      message: "Service deleted successfully!"
    });
  } catch (err) {
    console.error("deleteService error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting service.",
      error: err.message
    });
  }
};

/**
 * Upload Service Image (Generic or draft)
 * POST /api/services/upload-image
 */
const uploadServiceImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided."
      });
    }

    const host = req.get("host") || "localhost:5000";
    const protocol = req.protocol || "http";
    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully!",
      imageUrl,
      image_url: imageUrl,
      filename: req.file.filename
    });
  } catch (err) {
    console.error("uploadServiceImage error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to process image upload.",
      error: err.message
    });
  }
};

/**
 * Upload Image For Specific Service
 * POST /api/services/:id/image
 */
const uploadServiceImageForId = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided."
      });
    }

    // Verify service ownership
    const { data: service, error: fetchErr } = await supabase
      .from("services")
      .select("*")
      .eq("service_id", id)
      .single();

    if (fetchErr || !service) {
      return res.status(404).json({
        success: false,
        message: "Service not found."
      });
    }

    if (service.provider_id !== userId && userRole !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. You can only update your own service images."
      });
    }

    const host = req.get("host") || "localhost:5000";
    const protocol = req.protocol || "http";
    const imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

    const { data: updated, error: updateErr } = await supabase
      .from("services")
      .update({
        image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq("service_id", id)
      .select("*, service_categories(*)")
      .single();

    if (updateErr) {
      return res.status(500).json({
        success: false,
        message: "Failed to update service record with image.",
        error: updateErr.message
      });
    }

    return res.json({
      success: true,
      message: "Service image uploaded successfully!",
      imageUrl,
      image_url: imageUrl,
      service: updated
    });
  } catch (err) {
    console.error("uploadServiceImageForId error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to upload service image.",
      error: err.message
    });
  }
};

/**
 * Delete Service Image
 * DELETE /api/services/:id/image
 */
const deleteServiceImage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const { data: service, error: fetchErr } = await supabase
      .from("services")
      .select("*")
      .eq("service_id", id)
      .single();

    if (fetchErr || !service) {
      return res.status(404).json({
        success: false,
        message: "Service not found."
      });
    }

    if (service.provider_id !== userId && userRole !== "ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. You can only delete your own service images."
      });
    }

    // Try deleting physical file if it was uploaded locally
    if (service.image_url && service.image_url.includes("/uploads/")) {
      try {
        const filename = service.image_url.split("/uploads/").pop();
        const filePath = path.resolve(__dirname, "../../uploads", filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.warn("Could not delete physical image file:", e.message);
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from("services")
      .update({
        image_url: null,
        updated_at: new Date().toISOString()
      })
      .eq("service_id", id)
      .select("*, service_categories(*)")
      .single();

    if (updateErr) {
      return res.status(500).json({
        success: false,
        message: "Failed to clear service image.",
        error: updateErr.message
      });
    }

    return res.json({
      success: true,
      message: "Service image removed.",
      service: updated
    });
  } catch (err) {
    console.error("deleteServiceImage error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete service image.",
      error: err.message
    });
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  uploadServiceImage,
  uploadServiceImageForId,
  deleteServiceImage
};
