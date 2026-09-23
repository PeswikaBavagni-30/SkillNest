const portfolioService = require("./portfolio.service");
const supabase = require("../../config/supabase");

/**
 * GET /api/portfolio/:providerId
 * Public: Get all portfolio items for a provider
 */
const getProviderPortfolio = async (req, res) => {
  try {
    const { providerId } = req.params;
    if (!providerId) {
      return res.status(400).json({
        success: false,
        message: "Provider ID is required."
      });
    }

    const items = await portfolioService.getByProvider(providerId);

    // Fetch provider basic profile to accompany portfolio
    const { data: provider } = await supabase
      .from("users")
      .select("user_id, full_name, role, is_verified, address")
      .eq("user_id", providerId)
      .single();

    return res.json({
      success: true,
      count: items.length,
      provider: provider || null,
      portfolio: items,
      items
    });
  } catch (err) {
    console.error("getProviderPortfolio error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve portfolio.",
      error: err.message
    });
  }
};

/**
 * POST /api/portfolio
 * Protected: Add portfolio item for authenticated provider
 * Supports file upload (req.file) or JSON imageUrl
 */
const addPortfolioItem = async (req, res) => {
  try {
    const providerId = req.user.id;
    let imageUrl = req.body.imageUrl || req.body.image_url;
    const caption = req.body.caption || "";
    const isPrimary = req.body.is_primary === "true" || req.body.is_primary === true;

    if (req.file) {
      const host = req.get("host") || "localhost:5000";
      const protocol = req.protocol || "http";
      imageUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
    }

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: "Please upload an image file or provide an imageUrl."
      });
    }

    const item = await portfolioService.addItem({
      providerId,
      imageUrl,
      caption,
      isPrimary
    });

    return res.status(201).json({
      success: true,
      message: "Portfolio item added successfully!",
      item,
      portfolio: item
    });
  } catch (err) {
    console.error("addPortfolioItem error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to add portfolio item."
    });
  }
};

/**
 * PUT /api/portfolio/:id/primary
 * Protected: Mark a portfolio image as primary
 */
const setPrimaryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    const item = await portfolioService.setPrimary({
      portfolioId: id,
      providerId,
      isAdmin
    });

    return res.json({
      success: true,
      message: "Image set as primary portfolio cover.",
      item
    });
  } catch (err) {
    console.error("setPrimaryItem error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to set primary image."
    });
  }
};

/**
 * DELETE /api/portfolio/:id
 * Protected: Remove a portfolio item
 */
const deletePortfolioItem = async (req, res) => {
  try {
    const { id } = req.params;
    const providerId = req.user.id;
    const isAdmin = req.user.role === "ADMIN";

    await portfolioService.deleteItem({
      portfolioId: id,
      providerId,
      isAdmin
    });

    return res.json({
      success: true,
      message: "Portfolio item removed successfully!"
    });
  } catch (err) {
    console.error("deletePortfolioItem error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to delete portfolio item."
    });
  }
};

module.exports = {
  getProviderPortfolio,
  addPortfolioItem,
  setPrimaryItem,
  deletePortfolioItem
};
