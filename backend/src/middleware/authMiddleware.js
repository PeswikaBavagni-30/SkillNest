const supabase = require("../config/supabase");
const jwt = require("jsonwebtoken");

/**
 * Authenticate Token Middleware
 * Verifies Bearer token using Supabase Auth or JWT,
 * checks account suspension status, and attaches req.user
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. Authentication token required."
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token with Supabase Auth
    let userEmail = null;
    let userId = null;

    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (!authError && authData?.user) {
      userEmail = authData.user.email;
      userId = authData.user.id;

      // Check if user is banned in Supabase Auth
      if (authData.user.banned_until && new Date(authData.user.banned_until) > new Date()) {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_SUSPENDED",
          message: "Your account is suspended. Please contact SkillNest support."
        });
      }
    } else {
      // Fallback: Verify signed JWT
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "skillnest_jwt_secret_key_2026_secure"
        );
        userEmail = decoded.email;
        userId = decoded.sub;
      } catch (jwtErr) {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired session token. Please log in again."
        });
      }
    }

    // Retrieve authoritative profile from users table
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("*")
      .eq("email", userEmail)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({
        success: false,
        message: "User account profile not found."
      });
    }

    // Attach validated user to request object
    req.user = {
      id: profile.user_id,
      name: profile.full_name,
      email: profile.email,
      role: (profile.role || "customer").toUpperCase(),
      phone: profile.phone,
      address: profile.address,
      is_verified: profile.is_verified,
      isProfileBuilt: Boolean(profile.phone || profile.address)
    };

    next();
  } catch (err) {
    console.error("authenticateToken middleware error:", err);
    return res.status(500).json({
      success: false,
      message: "Authentication verification failed.",
      error: err.message
    });
  }
};

/**
 * Role-Based Authorization Middleware
 * Checks if authenticated user has one of the allowed roles
 * e.g. requireRole(["CUSTOMER"]) or requireRole(["PROVIDER"])
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please authenticate first."
      });
    }

    const userRole = req.user.role.toUpperCase();
    const normalizedAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This action requires ${allowedRoles.join(" or ")} access.`
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
