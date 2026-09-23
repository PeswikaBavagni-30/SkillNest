const express = require("express");
const router = express.Router();
const { chatWithAI } = require("./ai.controller");

// POST /api/ai/chat - Chat with SkillNest AI Assistant
router.post("/chat", chatWithAI);

module.exports = router;
