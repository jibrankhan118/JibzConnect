const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");

const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Initialize Gemini client with API key from environment
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Warning: GEMINI_API_KEY is not set in environment variables");
}

// POST a message to AI chat
router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty.",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "AI service is not configured.",
      });
    }

    const trimmedMessage = message.trim();

    // Initialize Gemini client with API key
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // Send message to Gemini and get response
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: trimmedMessage,
    });

    const aiReply = response.text;

    res.status(200).json({
      success: true,
      reply: aiReply,
    });
  } catch (error) {
    console.error("Error processing AI message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate AI response",
    });
  }
});

module.exports = router;
