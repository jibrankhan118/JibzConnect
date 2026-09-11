const express = require("express");
const { chat, getHistory, analyzeDirectMessages, analyzeChannel } = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/chat", authMiddleware, chat);
router.get("/history", authMiddleware, getHistory);
router.get("/analyze-dm/:userId", authMiddleware, analyzeDirectMessages);
router.get("/analyze-channel/:channelName", authMiddleware, analyzeChannel);

module.exports = router;
