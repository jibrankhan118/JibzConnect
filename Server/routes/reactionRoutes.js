const express = require("express");
const { getReactions, toggleReaction } = require("../controllers/reactionController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

if (false) {

const Reaction = require("../models/Reaction");
const Message = require("../models/Message");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Allowed emojis - keeps things clean and avoids abuse
const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];

// GET all reactions for a specific message
router.get("/:messageId", async (req, res) => {
  try {
    const reactions = await Reaction.findAll({
      where: { messageId: req.params.messageId },
      include: [{ model: User, attributes: ["id", "username"] }],
    });

    res.json(reactions);
  } catch (error) {
    console.error("Error fetching reactions:", error);
    res.status(500).json({ message: "Server error fetching reactions." });
  }
});

// POST - toggle a reaction (add if not exists, remove if already reacted)
router.post("/", async (req, res) => {
  try {
    const { messageId, emoji } = req.body;
    const userId = req.user.id;

    if (!messageId || !emoji) {
      return res.status(400).json({ message: "messageId and emoji are required." });
    }

    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return res.status(400).json({ message: "Emoji not allowed." });
    }

    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found." });
    }

    // Check if this user already reacted with this emoji
    const existing = await Reaction.findOne({
      where: { messageId, userId, emoji },
    });

    if (existing) {
      // Already reacted — remove it (toggle off)
      await existing.destroy();
      return res.json({ action: "removed", messageId, emoji });
    }

    // Not reacted yet — add it (toggle on)
    const reaction = await Reaction.create({ messageId, userId, emoji });
    return res.status(201).json({ action: "added", reaction, messageId, emoji });

  } catch (error) {
    console.error("Error toggling reaction:", error);
    res.status(500).json({ message: "Server error toggling reaction." });
  }
});

}

router.use(authMiddleware);
router.get("/:messageId", getReactions);
router.post("/", toggleReaction);

module.exports = router;
