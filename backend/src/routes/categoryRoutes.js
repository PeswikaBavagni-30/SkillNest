const express = require("express");
const router = express.Router();
const { getCategories, createCategory } = require("../controllers/categoryController");
const { authenticateToken } = require("../middleware/authMiddleware");

// GET /api/categories - Public: Get all categories
router.get("/", getCategories);

// POST /api/categories - Authenticated: Add a new category
router.post("/", authenticateToken, createCategory);

module.exports = router;
