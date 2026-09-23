const supabase = require("../config/supabase");
const { updateProfile, getMe } = require("./authController");
const dualRoleService = require("../modules/auth/dualRole.service");

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

/**
 * Switch Active User Mode (Customer <-> Provider)
 * PUT /api/users/switch-mode
 * Body: { mode: 'customer' | 'provider' }
 */
const switchUserMode = async (req, res) => {
  try {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const mode = req.body.mode || req.body.targetMode;

    if (!mode || typeof mode !== "string") {
      return res.status(400).json({
        success: false,
        message: "Target mode is required ('customer' or 'provider')."
      });
    }

    const normalizedMode = mode.toLowerCase().trim();
    if (!["customer", "provider"].includes(normalizedMode)) {
      return res.status(400).json({
        success: false,
        message: "Invalid mode. Allowed modes are 'customer' or 'provider'."
      });
    }

    // Strictly enforce same-email dual registration requirement
    if (req.user.role !== "ADMIN" && !dualRoleService.isDualRole(userEmail)) {
      return res.status(403).json({
        success: false,
        message: "Mode switching is only available if you register with the same email as both a Customer and a Provider."
      });
    }

    const currentRole = req.user.role;
    const newRole = currentRole === "ADMIN" ? "admin" : normalizedMode;

    const { data: updatedUser, error } = await supabase
      .from("users")
      .update({
        role: newRole,
        updated_at: new Date().toISOString()
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("switchUserMode database error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to switch mode: " + error.message
      });
    }

    const isProfileBuilt = Boolean(updatedUser.phone || updatedUser.address);

    return res.json({
      success: true,
      message: `Successfully switched to ${normalizedMode.toUpperCase()} mode!`,
      active_role: normalizedMode.toUpperCase(),
      user: {
        id: updatedUser.user_id,
        name: updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone || null,
        address: updatedUser.address || null,
        role: (currentRole === "ADMIN" ? "ADMIN" : normalizedMode.toUpperCase()),
        active_role: normalizedMode.toUpperCase(),
        is_verified: updatedUser.is_verified,
        isProfileBuilt,
        can_switch_mode: true
      }
    });
  } catch (err) {
    console.error("switchUserMode error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error switching user mode.",
      error: err.message
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  getAllUsers,
  verifyProvider,
  deleteUser,
  switchUserMode
};
