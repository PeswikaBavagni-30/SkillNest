const supabase = require("../config/supabase");
const { updateProfile, getMe } = require("./authController");

/**
 * User Profile Controller
 * GET /api/users/profile
 * PUT /api/users/profile
 */
const getUserProfile = async (req, res) => {
  return getMe(req, res);
};

const updateUserProfile = async (req, res) => {
  return updateProfile(req, res);
};

/**
 * Admin: Get All Users
 * GET /api/users
 */
const getAllUsers = async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select("user_id, full_name, email, role, phone, address, is_verified, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch users.",
        error: error.message
      });
    }

    return res.json({
      success: true,
      count: users?.length || 0,
      users: users || []
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal server error fetching users.",
      error: err.message
    });
  }
};

/**
 * Admin: Verify / Approve or Revoke Provider
 * PUT /api/users/:id/verify
 */
const verifyProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_verified } = req.body;
    const verificationStatus = is_verified !== undefined ? Boolean(is_verified) : true;

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({
        is_verified: verificationStatus,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to update provider verification status.",
        error: error.message
      });
    }

    return res.json({
      success: true,
      message: verificationStatus
        ? `Provider ${updatedUser.full_name || ""} has been verified and approved!`
        : `Provider ${updatedUser.full_name || ""} verification has been revoked.`,
      user: updatedUser
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error processing provider verification.",
      error: err.message
    });
  }
};

/**
 * Admin: Delete User
 * DELETE /api/users/:id
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("user_id", id);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete user.",
        error: error.message
      });
    }

    return res.json({
      success: true,
      message: "User deleted successfully!"
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error deleting user.",
      error: err.message
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  verifyProvider,
  deleteUser
};
