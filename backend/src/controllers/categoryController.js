const supabase = require("../config/supabase");

/**
 * Get All Categories
 * GET /api/categories
 */
const getCategories = async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from("service_categories")
      .select("*")
      .order("category_name", { ascending: true });

    if (error) {
      console.error("Error fetching categories:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch service categories.",
        error: error.message
      });
    }

    return res.json({
      success: true,
      count: categories?.length || 0,
      categories: categories || []
    });
  } catch (err) {
    console.error("getCategories error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while retrieving categories.",
      error: err.message
    });
  }
};

/**
 * Create a New Category
 * POST /api/categories
 */
const createCategory = async (req, res) => {
  try {
    const { category_name, description } = req.body;

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required."
      });
    }

    // Check if category already exists
    const { data: existing } = await supabase
      .from("service_categories")
      .select("category_id")
      .ilike("category_name", category_name.trim())
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A category with this name already exists."
      });
    }

    const { data: newCategory, error } = await supabase
      .from("service_categories")
      .insert({
        category_name: category_name.trim(),
        description: description?.trim() || null
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to create category.",
        error: error.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "Category created successfully!",
      category: newCategory
    });
  } catch (err) {
    console.error("createCategory error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error while creating category.",
      error: err.message
    });
  }
};

module.exports = {
  getCategories,
  createCategory
};
