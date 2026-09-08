
const express = require("express");
const router = express.Router();


const authMiddleware = require("../middleware/authMiddleware");
const DirectMessage = require("../models/DirectMessage");
const Channel = require("../models/Channel");
const ChannelMember = require("../models/ChannelMember");
const Message = require("../models/Message");
const AIMessage = require("../models/AIMessage");
const { searchKnowledge } = require("../services/knowledgeSearch");

router.use(authMiddleware);

// Initialize OpenRouter API key
const apiKey = process.env.OPENROUTER_API_KEY;
async function generateChatResponse(messages) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "OpenRouter chat request failed."
    );
  }

  return data?.choices?.[0]?.message?.content;
}

if (!apiKey) {
  console.error(
    "Warning: OPENROUTER_API_KEY is not set in environment variables"
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
    console.log("AI CHAT RECEIVED:", trimmedMessage);
    // Initialize autoroutes client
   await AIMessage.create({
  userId: req.user.id,
  role: "user",
  message: trimmedMessage,
});

const knowledgeResults = await searchKnowledge(trimmedMessage, 5);

const knowledgeContext = knowledgeResults.length
  ? knowledgeResults
      .map(
        (item, index) =>
          `Knowledge ${index + 1}:
Source: ${item.sourcePath}
${item.content}`
      )
      .join("\n\n---\n\n")
  : "No relevant project knowledge was found.";

const aiReply = await generateChatResponse([
  {
    role: "system",
   content: `You are the AI assistant for JibzConnect.

You have access to two sources of information:

1. YOUR GENERAL KNOWLEDGE

You are allowed and expected to answer general questions using your normal knowledge.

Examples of general questions:
- What is Python?
- What is JavaScript?
- What is Node.js?
- What is React?
- What is PostgreSQL?
- What is artificial intelligence?
- What is an API?

For general questions, answer normally using your general knowledge.

DO NOT require the JibzConnect project knowledge to answer general questions.
DO NOT say "I do not have enough information" simply because the project knowledge does not contain the answer.

2. JIBZCONNECT PROJECT KNOWLEDGE

When the user asks specifically about JibzConnect, its code, database, models, APIs, authentication, channels, messages, frontend, backend, or other project functionality, use the provided project knowledge as the primary source.

Do not invent JibzConnect-specific details that are not supported by the project knowledge.

IMPORTANT RULES:

- If the question is general, answer it normally using your general knowledge.
- If the question is about JibzConnect, use the project knowledge.
- If the project knowledge is irrelevant to a general question, completely ignore it.
- Never refuse a general knowledge question just because the project knowledge does not contain the answer.

Here is the retrieved JibzConnect project knowledge:



Project knowledge:
${knowledgeContext}`,
  },
  {
    role: "user",
    content: trimmedMessage,
  },
]);

   

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

/*
====================================================
POST /embed
Generate an embedding for text
====================================================
*/

router.post("/embed", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text cannot be empty.",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "AI service is not configured.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    const result = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: text.trim(),
    });

    const embedding = result.embeddings?.[0]?.values;

    if (!embedding) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate embedding.",
      });
    }

    return res.status(200).json({
      success: true,
      dimensions: embedding.length,
      embedding: embedding,
    });
  } catch (error) {
    console.error("Error generating embedding:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate embedding.",
    });
  }
});

module.exports = router;

