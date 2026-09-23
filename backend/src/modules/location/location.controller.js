const locationService = require("./location.service");

/**
 * Get current user's structured location
 * GET /api/location/user
 */
const getUserLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const location = await locationService.getUserLocation(userId);

    return res.json({
      success: true,
      data: location || {
        user_id: userId,
        city: "",
        state: "",
        country: "India",
        pincode: "",
        area: ""
      }
    });
  } catch (err) {
    console.error("getUserLocation error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch user location.",
      error: err.message
    });
  }
};

/**
 * Update current user's structured location
 * PUT /api/location/user
 * Body: { city, state, country, pincode, area, latitude, longitude }
 */
const updateUserLocation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { city, state, country, pincode, area, latitude, longitude } = req.body;

    if (!city || !city.trim()) {
      return res.status(400).json({
        success: false,
        message: "City is required."
      });
    }

    const updatedLocation = await locationService.setUserLocation(userId, {
      city,
      state,
      country,
      pincode,
      area,
      latitude,
      longitude
    });

    return res.json({
      success: true,
      message: "Location updated successfully!",
      location: updatedLocation
    });
  } catch (err) {
    console.error("updateUserLocation error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update location.",
      error: err.message
    });
  }
};

/**
 * Get Provider's Service Areas
 * GET /api/location/service-areas
 */
const getProviderServiceAreas = async (req, res) => {
  try {
    const providerId = req.user.id;
    const areas = await locationService.getProviderServiceAreas(providerId);
    const summary = await locationService.getProviderLocationSummary(providerId);

    return res.json({
      success: true,
      count: areas.length,
      areas,
      summary
    });
  } catch (err) {
    console.error("getProviderServiceAreas error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider service areas.",
      error: err.message
    });
  }
};

/**
 * Add a new Service Area for Provider
 * POST /api/location/service-areas
 * Body: { city, state, pincode, area }
 */
const addProviderServiceArea = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { city, state, pincode, area } = req.body;

    if (!city || !city.trim()) {
      return res.status(400).json({
        success: false,
        message: "City name is required for service area."
      });
    }

    const newArea = await locationService.addProviderServiceArea(providerId, {
      city,
      state,
      pincode,
      area
    });

    return res.status(201).json({
      success: true,
      message: `Added ${newArea.city} to your service areas.`,
      area: newArea
    });
  } catch (err) {
    console.error("addProviderServiceArea error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to add service area.",
      error: err.message
    });
  }
};

/**
 * Delete a Service Area
 * DELETE /api/location/service-areas/:id
 */
const deleteProviderServiceArea = async (req, res) => {
  try {
    const providerId = req.user.id;
    const { id } = req.params;

    const removed = await locationService.deleteProviderServiceArea(providerId, id);

    return res.json({
      success: true,
      message: `Removed ${removed.city} from your service areas.`,
      removed
    });
  } catch (err) {
    console.error("deleteProviderServiceArea error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to remove service area."
    });
  }
};

/**
 * Check if a provider serves a given location
 * GET /api/location/check
 * Query: ?providerId=&city=&state=&pincode=&address=
 */
const checkProviderCoverage = async (req, res) => {
  try {
    const { providerId, city, state, pincode, address } = req.query;

    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "providerId is required."
      });
    }

    const isServing = await locationService.isProviderServingLocation(providerId, {
      city,
      state,
      pincode,
      address
    });

    return res.json({
      success: true,
      providerId,
      servesLocation: isServing
    });
  } catch (err) {
    console.error("checkProviderCoverage error:", err);
    return res.status(500).json({
      success: false,
      message: "Error checking location coverage.",
      error: err.message
    });
  }
};

/**
 * Get public provider location summary
 * GET /api/location/provider/:providerId
 */
const getPublicProviderLocation = async (req, res) => {
  try {
    const { providerId } = req.params;
    const summary = await locationService.getProviderLocationSummary(providerId);

    return res.json({
      success: true,
      summary
    });
  } catch (err) {
    console.error("getPublicProviderLocation error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider location details.",
      error: err.message
    });
  }
};

module.exports = {
  getUserLocation,
  updateUserLocation,
  getProviderServiceAreas,
  addProviderServiceArea,
  deleteProviderServiceArea,
  checkProviderCoverage,
  getPublicProviderLocation
};
