const Reaction = require("../models/Reaction");
const Message = require("../models/Message");
const User = require("../models/User");

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];

const getReactions = async (req, res) => {
  try {
    const reactions = await Reaction.findAll({ where: { messageId: req.params.messageId }, include: [{ model: User, attributes: ["id", "username"] }] });
    res.json(reactions);
  } catch (error) {
    console.error("Error fetching reactions:", error);
    res.status(500).json({ message: "Server error fetching reactions." });
  }
};

const toggleReaction = async (req, res) => {
  try {
    const { messageId, emoji } = req.body;
    const userId = req.user.id;
    if (!messageId || !emoji) return res.status(400).json({ message: "messageId and emoji are required." });
    if (!ALLOWED_EMOJIS.includes(emoji)) return res.status(400).json({ message: "Emoji not allowed." });
    const message = await Message.findByPk(messageId);
    if (!message) return res.status(404).json({ message: "Message not found." });
    const existing = await Reaction.findOne({ where: { messageId, userId, emoji } });
    if (existing) {
      await existing.destroy();
      return res.json({ action: "removed", messageId, emoji });
    }
    const reaction = await Reaction.create({ messageId, userId, emoji });
    return res.status(201).json({ action: "added", reaction, messageId, emoji });
  } catch (error) {
    console.error("Error toggling reaction:", error);
    res.status(500).json({ message: "Server error toggling reaction." });
  }
};

module.exports = { getReactions, toggleReaction };
