const aiService = require("./ai.service");
const jwt = require("jsonwebtoken");

/**
 * POST /api/ai/chat
 * Permissive authentication: authenticated users get personalized booking context,
 * guest visitors can still explore services and platform features safely.
 */
const chatWithAI = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "A non-empty 'message' string is required."
      });
    }

    // Try decoding auth token if present
    let userContext = req.user || null;
    if (!userContext && req.headers.authorization?.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "skillnest_jwt_secret_key_2026_secure"
        );
        userContext = {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name || null,
          role: decoded.role || "CUSTOMER"
        };
      } catch {
        // Token invalid or expired - treat as guest
        userContext = null;
      }
    }

    const response = await aiService.handleChat({
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      user: userContext
    });

    return res.json({
      success: true,
      ...response
    });
  } catch (err) {
    console.error("chatWithAI error:", err);
    return res.status(500).json({
      success: false,
      message: "AI assistant service encountered an error. Please try again shortly.",
      error: err.message
    });
  }
};

module.exports = {
  chatWithAI
};
