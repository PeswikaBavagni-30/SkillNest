const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const supabase = require("./src/config/supabase");
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/userRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const serviceRoutes = require("./src/routes/serviceRoutes");
const bookingRoutes = require("./src/routes/bookingRoutes");
const paymentRoutes = require("./src/modules/payments-notifications/payment.routes");
const notificationRoutes = require("./src/modules/payments-notifications/notification.routes");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for any frontend requests on localhost
app.use(cors({
  origin: (origin, callback) => {
    // Allow any localhost port (5173, 5174, 5175, 3000, etc.) or no-origin (like curl / mobile)
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in dev mode
    }
  },
  credentials: true
}));

// Parse JSON request bodies
app.use(express.json());

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/notifications", notificationRoutes);

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const { data, error } = await supabase.from("users").select("count", { count: "exact", head: true });
    if (error) throw error;
    res.json({
      status: "online",
      message: "SkillNest API is running and connected to Supabase",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "API running but Supabase connection failed",
      error: err.message
    });
  }
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 SkillNest backend listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
