
const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");

const authMiddleware = require("../middleware/authMiddleware");
const DirectMessage = require("../models/DirectMessage");
const Channel = require("../models/Channel");
const ChannelMember = require("../models/ChannelMember");
const Message = require("../models/Message");
const AIMessage = require("../models/AIMessage");

router.use(authMiddleware);

// Initialize Gemini API key
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error(
    "Warning: GEMINI_API_KEY is not set in environment variables"
  );
}

/*
====================================================
POST /chat
Send a message to Gemini and save both messages
(user + assistant) in the database
====================================================
*/

router.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    // Validate message
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty.",
      });
    }

    // Check Gemini API key
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "AI service is not configured.",
      });
    }

    const trimmedMessage = message.trim();

    // Initialize Gemini client
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // Save user's message
    await AIMessage.create({
      userId: req.user.id,
      role: "user",
      message: trimmedMessage,
    });

    // Send message to Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: trimmedMessage,
    });

    const aiReply = response.text;

    // Save Gemini response
    await AIMessage.create({
      userId: req.user.id,
      role: "assistant",
      message: aiReply,
    });

    // Send response to frontend
    return res.status(200).json({
      success: true,
      reply: aiReply,
    });
  } catch (error) {
    console.error("Error processing AI message:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate AI response",
    });
  }
});

/*
====================================================
GET /history
Get AI chat history for the logged-in user
====================================================
*/

router.get("/history", async (req, res) => {
  try {
    const loggedInUserId = req.user.id;

    // Find all AI messages belonging to logged-in user
    const messages = await AIMessage.findAll({
      where: {
        userId: loggedInUserId,
      },
      order: [["createdAt", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      messages: messages,
    });
  } catch (error) {
    console.error("Error retrieving AI chat history:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve AI chat history",
    });
  }
});

/*
====================================================
GET /dm-analysis/:userId
Get recent direct messages between two users
====================================================
*/

router.get("/dm-analysis/:userId", async (req, res) => {
  try {
    const loggedInUserId = req.user.id;
    const targetUserId = parseInt(req.params.userId);

    if (!targetUserId || isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId parameter",
      });
    }

    let messageLimit = 100;

    if (req.query.limit) {
      const parsedLimit = parseInt(req.query.limit);

      if (
        !isNaN(parsedLimit) &&
        parsedLimit > 0 &&
        parsedLimit <= 100
      ) {
        messageLimit = parsedLimit;
      }
    }

    const { Op } = require("sequelize");

    const messages = await DirectMessage.findAll({
      where: {
        [Op.or]: [
          {
            senderId: loggedInUserId,
            recipientId: targetUserId,
          },
          {
            senderId: targetUserId,
            recipientId: loggedInUserId,
          },
        ],
      },
      order: [["createdAt", "DESC"]],
      limit: messageLimit,
    });

    // Reverse to chronological order
    messages.reverse();

    return res.status(200).json({
      success: true,
      messages: messages,
    });
  } catch (error) {
    console.error("Error retrieving DM analysis:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve messages",
    });
  }
});

/*
====================================================
GET /channel-analysis/:channelName
Get recent messages for a channel
====================================================
*/

router.get("/channel-analysis/:channelName", async (req, res) => {
  try {
    const channelName = req.params.channelName;
    const loggedInUserId = req.user.id;

    // Find channel
    const channel = await Channel.findOne({
      where: {
        name: channelName,
      },
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found.",
      });
    }

    // Check membership
    const isMember = await ChannelMember.findOne({
      where: {
        userId: loggedInUserId,
        channelId: channel.id,
      },
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this channel.",
      });
    }

    // Retrieve latest 100 messages
    const messages = await Message.findAll({
      where: {
        channel: channelName,
      },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });

    // Reverse to chronological order
    messages.reverse();

    return res.status(200).json({
      success: true,
      messages: messages,
    });
  } catch (error) {
    console.error("Error retrieving channel analysis:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve channel messages",
    });
  }
});

/*
====================================================
POST /analyze-dm/:userId
Analyze direct-message conversation using Gemini
====================================================
*/

router.post("/analyze-dm/:userId", async (req, res) => {
  try {
    const loggedInUserId = req.user.id;
    const targetUserId = parseInt(req.params.userId);

    if (!targetUserId || isNaN(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid userId parameter",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "AI service is not configured.",
      });
    }

    let messageLimit = 100;

    if (req.query.limit) {
      const parsedLimit = parseInt(req.query.limit);

      if (
        !isNaN(parsedLimit) &&
        parsedLimit > 0 &&
        parsedLimit <= 100
      ) {
        messageLimit = parsedLimit;
      }
    }

    const { Op } = require("sequelize");

    const messages = await DirectMessage.findAll({
      where: {
        [Op.or]: [
          {
            senderId: loggedInUserId,
            recipientId: targetUserId,
          },
          {
            senderId: targetUserId,
            recipientId: loggedInUserId,
          },
        ],
      },
      order: [["createdAt", "DESC"]],
      limit: messageLimit,
    });

    // Reverse to chronological order
    messages.reverse();

    if (messages.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No messages found for analysis.",
      });
    }

    // Convert messages into readable conversation
    let conversationText = "Conversation between users:\n\n";

    messages.forEach((msg) => {
      conversationText += `User ${msg.senderId}: ${msg.message}\n`;
    });

    // Initialize Gemini
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    const analysisPrompt = `Analyze the following conversation between two users. Interpret the tone of the language used in the messages. Remember that this is an AI interpretation of the language, NOT a definitive judgment about either person.

${conversationText}

Provide analysis in ONLY the following JSON format (no additional text):
{
  "overallTone": "",
  "toneBreakdown": {
    "calm": 0,
    "friendly": 0,
    "neutral": 0,
    "frustrated": 0,
    "aggressive": 0
  },
  "summary": "",
  "keyPoints": [],
  "recentTrend": ""
}

Requirements:
- overallTone must be one of: Calm, Friendly, Neutral, Frustrated, Aggressive, Mixed
- toneBreakdown values must be percentages that add up to 100
- summary should be a short summary of the conversation
- keyPoints should be an array of strings containing main points/topics discussed
- recentTrend must be one of: positive, negative, neutral

Return ONLY valid JSON, nothing else.`;

    // Send to Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: analysisPrompt,
    });

    const analysisText = response.text;

    // Parse Gemini JSON
    let parsedAnalysis;

    try {
      parsedAnalysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini response as JSON:",
        analysisText
      );

      return res.status(500).json({
        success: false,
        message: "Failed to parse AI analysis response",
      });
    }

    return res.status(200).json({
      success: true,
      analysis: parsedAnalysis,
    });
  } catch (error) {
    console.error("Error analyzing DM:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to analyze messages",
    });
  }
});

/*
====================================================
POST /analyze-channel/:channelName
Analyze channel messages using Gemini
====================================================
*/

router.post("/analyze-channel/:channelName", async (req, res) => {
  try {
    const channelName = req.params.channelName;
    const loggedInUserId = req.user.id;

    if (!channelName || typeof channelName !== "string") {
      return res.status(400).json({
        success: false,
        message: "Invalid channel name parameter",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "AI service is not configured.",
      });
    }

    let messageLimit = 100;

    if (req.query.limit) {
      const parsedLimit = parseInt(req.query.limit);

      if (
        !isNaN(parsedLimit) &&
        parsedLimit > 0 &&
        parsedLimit <= 100
      ) {
        messageLimit = parsedLimit;
      }
    }

    // Find channel
    const channel = await Channel.findOne({
      where: {
        name: channelName,
      },
    });

    if (!channel) {
      return res.status(404).json({
        success: false,
        message: "Channel not found.",
      });
    }

    // Check membership
    const isMember = await ChannelMember.findOne({
      where: {
        userId: loggedInUserId,
        channelId: channel.id,
      },
    });

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this channel.",
      });
    }

    // Retrieve channel messages
    const messages = await Message.findAll({
      where: {
        channel: channelName,
      },
      order: [["createdAt", "DESC"]],
      limit: messageLimit,
    });

    // Reverse to chronological order
    messages.reverse();

    if (messages.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No messages found for analysis.",
      });
    }

    // Convert messages into readable conversation
    let conversationText = "Channel conversation:\n\n";

    messages.forEach((msg) => {
      conversationText += `User ${msg.sender}: ${msg.message}\n`;
    });

    // Initialize Gemini
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    const analysisPrompt = `Analyze the following channel conversation. Interpret the tone of the language used in the messages. Remember that this is an AI interpretation of the language, NOT a definitive judgment about any person.

${conversationText}

Provide analysis in ONLY the following JSON format (no additional text):
{
  "overallTone": "",
  "toneBreakdown": {
    "calm": 0,
    "friendly": 0,
    "neutral": 0,
    "frustrated": 0,
    "aggressive": 0
  },
  "summary": "",
  "keyPoints": [],
  "recentTrend": ""
}

Requirements:
- overallTone must be one of: Calm, Friendly, Neutral, Frustrated, Aggressive, Mixed
- toneBreakdown values must be percentages that add up to 100
- summary should be a short summary of the channel conversation
- keyPoints should be an array of strings containing main topics discussed
- recentTrend must be one of: positive, negative, neutral

Return ONLY valid JSON, nothing else.`;

    // Send to Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: analysisPrompt,
    });

    const analysisText = response.text;

    // Parse Gemini JSON
    let parsedAnalysis;

    try {
      parsedAnalysis = JSON.parse(analysisText);
    } catch (parseError) {
      console.error(
        "Failed to parse Gemini response as JSON:",
        analysisText
      );

      return res.status(500).json({
        success: false,
        message: "Failed to parse AI analysis response",
      });
    }

    return res.status(200).json({
      success: true,
      analysis: parsedAnalysis,
    });
  } catch (error) {
    console.error("Error analyzing channel:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to analyze channel messages",
    });
  }
});

module.exports = router;

