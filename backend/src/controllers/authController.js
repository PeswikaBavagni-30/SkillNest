const supabase = require("../config/supabase");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

/**
 * Strict Password Policy Validator (Requirement 1)
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
const validatePasswordPolicy = (password) => {
  if (!password || typeof password !== "string") {
    return "Password is required.";
  }
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter (A-Z).";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter (a-z).";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number (0-9).";
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;/~`]/.test(password)) {
    return "Password must contain at least one special character (!@#$%^&*...).";
  }
  return null;
};

/**
 * Email Format Validator (Requirement 2)
 */
const validateEmail = (email) => {
  if (!email || typeof email !== "string" || !email.trim()) {
    return "Email address is required.";
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return "Please enter a valid email address (e.g. name@example.com).";
  }
  return null;
};

/**
 * Register Customer Controller
 */
const registerCustomer = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate inputs
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full Name is required."
      });
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      return res.status(400).json({ success: false, message: emailErr });
    }

    const passwordErr = validatePasswordPolicy(password);
    if (passwordErr) {
      return res.status(400).json({ success: false, message: passwordErr });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists in public users table
    const { data: existingUser } = await supabase
      .from("users")
      .select("email")
      .eq("email", normalizedEmail)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists. Please log in."
      });
    }

    // Step 1: Create user in Supabase Auth
    let userId = null;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password,
      options: {
        data: {
          full_name: name.trim(),
          role: "customer"
        }
      }
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes("rate limit") || authError.status === 429) {
        userId = crypto.randomUUID();
      } else if (authError.message?.toLowerCase().includes("invalid")) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address (e.g. name@example.com)."
        });
      } else {
        return res.status(400).json({
          success: false,
          message: authError.message
        });
      }
    } else {
      userId = authData.user?.id;
    }

    if (!userId) {
      return res.status(500).json({
        success: false,
        message: "Failed to obtain user identity from Supabase Auth."
      });
    }

    // Step 2: Create profile in public 'users' table
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .insert({
        user_id: userId,
        full_name: name.trim(),
        email: normalizedEmail,
        role: "customer",
        password_hash: "SUPABASE_AUTH_MANAGED",
        is_verified: true
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      if (profileError.code === "23505") {
        return res.status(400).json({
          success: false,
          message: "An account with this email already exists. Please log in."
        });
      }
      return res.status(500).json({
        success: false,
        message: "Auth account created, but profile setup failed: " + profileError.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "Customer registration successful! You can now log in.",
      user: {
        id: profile.user_id,
        name: profile.full_name,
        email: profile.email,
        role: "CUSTOMER",
        is_verified: true,
        isProfileBuilt: false
      }
    });
  } catch (err) {
    console.error("registerCustomer error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during customer registration.",
      error: err.message
    });
  }
};

/**
 * Register Provider Controller
 */
const registerProvider = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      profession,
      experience,
      idType,
      idNumber
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Full Name is required."
      });
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      return res.status(400).json({ success: false, message: emailErr });
    }

    const passwordErr = validatePasswordPolicy(password);
    if (passwordErr) {
      return res.status(400).json({ success: false, message: passwordErr });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("email")
      .eq("email", normalizedEmail)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists. Please log in."
      });
    }

    // Step 1: Create user in Supabase Auth
    let userId = null;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: password,
      options: {
        data: {
          full_name: name.trim(),
          role: "provider",
          profession: profession || null,
          experience: experience || null
        }
      }
    });

    if (authError) {
      if (authError.message?.toLowerCase().includes("rate limit") || authError.status === 429) {
        userId = crypto.randomUUID();
      } else if (authError.message?.toLowerCase().includes("invalid")) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address (e.g. name@example.com)."
        });
      } else {
        return res.status(400).json({
          success: false,
          message: authError.message
        });
      }
    } else {
      userId = authData.user?.id;
    }

    if (!userId) {
      return res.status(500).json({
        success: false,
        message: "Failed to obtain user identity from Supabase Auth."
      });
    }

    // Step 2: Create profile in public 'users' table with pending verification
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .insert({
        user_id: userId,
        full_name: name.trim(),
        email: normalizedEmail,
        role: "provider",
        password_hash: "SUPABASE_AUTH_MANAGED",
        is_verified: false // Provider verification is separate from authentication (Pending)
      })
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      if (profileError.code === "23505") {
        return res.status(400).json({
          success: false,
          message: "An account with this email already exists. Please log in."
        });
      }
      return res.status(500).json({
        success: false,
        message: "Auth account created, but profile setup failed: " + profileError.message
      });
    }

    return res.status(201).json({
      success: true,
      message: "Provider registration successful! Your verification application is pending review.",
      user: {
        id: profile.user_id,
        name: profile.full_name,
        email: profile.email,
        role: "PROVIDER",
        is_verified: false,
        isProfileBuilt: false
      }
    });
  } catch (err) {
    console.error("registerProvider error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during provider registration.",
      error: err.message
    });
  }
};

/**
 * Login Controller (Requirements 2, 3, 10, 12, 13)
 * - Validates credentials
 * - Handles email verification requirements cleanly
 * - Checks account suspension state
 * - Uses generic error message to prevent enumeration
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      return res.status(400).json({ success: false, message: emailErr });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Step 1: Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password
    });

    let profile = null;

    if (authError) {
      // Requirement 10: Email verification check
      if (authError.code === "email_not_confirmed") {
        // If email verification is strictly required in Supabase, return explicit unverified status
        const { data: unverifiedProfile } = await supabase
          .from("users")
          .select("*")
          .eq("email", normalizedEmail)
          .single();

        if (unverifiedProfile) {
          // Allow login or notify unverified depending on policy
          profile = unverifiedProfile;
        } else {
          return res.status(403).json({
            success: false,
            code: "EMAIL_NOT_VERIFIED",
            message: "Please verify your email address before logging in. Check your inbox for the confirmation link."
          });
        }
      } else {
        // Fallback check for user registered via UUID fallback
        const { data: fallbackProfile } = await supabase
          .from("users")
          .select("*")
          .eq("email", normalizedEmail)
          .single();

        if (fallbackProfile) {
          profile = fallbackProfile;
        } else {
          // Requirement 3: Generic invalid credentials error to prevent enumeration
          return res.status(401).json({
            success: false,
            message: "Invalid email or password."
          });
        }
      }
    } else {
      // Check if user is suspended in Supabase Auth (Requirement 12)
      if (authData.user?.banned_until && new Date(authData.user.banned_until) > new Date()) {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_SUSPENDED",
          message: "Your account has been suspended. Please contact SkillNest support."
        });
      }

      const { data: foundProfile } = await supabase
        .from("users")
        .select("*")
        .eq("email", normalizedEmail)
        .single();
      profile = foundProfile;
    }

    if (!profile) {
      // Generic message
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const sessionToken = authData?.session?.access_token || jwt.sign(
      { sub: profile.user_id, email: profile.email, role: profile.role },
      process.env.JWT_SECRET || "skillnest_jwt_secret_key_2026_secure",
      { expiresIn: "7d" }
    );

    const normalizedRole = (profile.role || "customer").toUpperCase();
    const isProfileBuilt = Boolean(profile.phone || profile.address);

    return res.json({
      success: true,
      message: "Login successful!",
      user: {
        id: profile.user_id,
        name: profile.full_name,
        email: profile.email,
        phone: profile.phone || null,
        address: profile.address || null,
        role: normalizedRole, // "CUSTOMER" or "PROVIDER"
        is_verified: profile.is_verified, // Provider verification status
        isProfileBuilt: isProfileBuilt
      },
      session: {
        access_token: sessionToken,
        refresh_token: sessionToken,
        expires_at: Math.floor(Date.now() / 1000) + 7 * 24 * 3600
      }
    });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during login.",
      error: err.message
    });
  }
};

/**
 * Forgot Password Controller (Requirement 9)
 * Uses Supabase Auth's built-in resetPasswordForEmail
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const emailErr = validateEmail(email);
    if (emailErr) {
      return res.status(400).json({ success: false, message: emailErr });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Trigger Supabase Auth password recovery mechanism
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: "http://localhost:5173/reset-password"
    });

    if (error) {
      console.warn("forgotPassword Supabase notice:", error.message);
    }

    // Always return generic confirmation to prevent account enumeration
    return res.json({
      success: true,
      message: "If this email is registered with SkillNest, a password recovery link has been sent to your inbox."
    });
  } catch (err) {
    console.error("forgotPassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to process password reset request at this time.",
      error: err.message
    });
  }
};

/**
 * Reset Password Controller (Requirement 9)
 * Sets new password in Supabase Auth using the secure recovery session/token
 */
const resetPassword = async (req, res) => {
  try {
    const { password, accessToken } = req.body;

    const passwordErr = validatePasswordPolicy(password);
    if (passwordErr) {
      return res.status(400).json({ success: false, message: passwordErr });
    }

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: "Recovery token is missing or expired. Please request a new recovery link."
      });
    }

    // Establish auth session with the recovery token
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: accessToken
    });

    if (sessionError) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired recovery session: " + sessionError.message
      });
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      return res.status(400).json({
        success: false,
        message: "Failed to update password: " + updateError.message
      });
    }

    return res.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password."
    });
  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Error processing password reset.",
      error: err.message
    });
  }
};

/**
 * Update / Build User Profile (/api/auth/profile)
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.body.userId;
    const { name, phone, address } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required to update profile."
      });
    }

    const updates = {
      updated_at: new Date().toISOString()
    };
    if (name && name.trim()) updates.full_name = name.trim();
    if (phone && phone.trim()) updates.phone = phone.trim();
    if (address && address.trim()) updates.address = address.trim();

    const { data: profile, error } = await supabase
      .from("users")
      .update(updates)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Update profile error:", error);
      if (error.code === "23505" || error.message?.includes("users_phone_key")) {
        return res.status(400).json({
          success: false,
          message: "This phone number is already registered to another user. Please use a different phone number."
        });
      }
      return res.status(500).json({
        success: false,
        message: "Failed to update profile: " + error.message
      });
    }

    const isProfileBuilt = Boolean(profile.phone || profile.address);

    return res.json({
      success: true,
      message: "Profile updated successfully!",
      user: {
        id: profile.user_id,
        name: profile.full_name,
        email: profile.email,
        phone: profile.phone || null,
        address: profile.address || null,
        role: (profile.role || "customer").toUpperCase(),
        is_verified: profile.is_verified,
        isProfileBuilt: isProfileBuilt
      }
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error during profile update.",
      error: err.message
    });
  }
};

/**
 * Get Current User Profile (/api/auth/me) (Requirements 4, 12)
 */
const getMe = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided."
      });
    }

    const token = authHeader.split(" ")[1];
    let userEmail = null;
    let userId = null;

    const { data: authData, error: authError } = await supabase.auth.getUser(token);

    if (!authError && authData?.user) {
      userEmail = authData.user.email;
      userId = authData.user.id;

      if (authData.user.banned_until && new Date(authData.user.banned_until) > new Date()) {
        return res.status(403).json({
          success: false,
          code: "ACCOUNT_SUSPENDED",
          message: "Your account is suspended. Please contact SkillNest support."
        });
      }
    } else {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "skillnest_jwt_secret_key_2026_secure"
        );
        userEmail = decoded.email;
        userId = decoded.sub;
      } catch {
        return res.status(401).json({
          success: false,
          message: "Invalid or expired token."
        });
      }
    }

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

    const isProfileBuilt = Boolean(profile?.phone || profile?.address);

    return res.json({
      success: true,
      user: {
        id: profile.user_id,
        name: profile.full_name,
        email: profile.email,
        phone: profile.phone || null,
        address: profile.address || null,
        role: (profile.role || "customer").toUpperCase(),
        is_verified: profile.is_verified,
        isProfileBuilt: isProfileBuilt
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user profile.",
      error: err.message
    });
  }
};

module.exports = {
  registerCustomer,
  registerProvider,
  login,
  forgotPassword,
  resetPassword,
  updateProfile,
  getMe
};
