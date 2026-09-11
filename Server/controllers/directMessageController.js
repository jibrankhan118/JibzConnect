const { Op } = require("sequelize");
const DirectMessage = require("../models/DirectMessage");
const User = require("../models/User");

const getDirectMessages = async (req, res) => {
  try {
    const myId = req.user.id;
    const otherUserId = Number(req.params.userId);
    if (!otherUserId) return res.status(400).json({ message: "Invalid user id." });
    const messages = await DirectMessage.findAll({
      where: { [Op.or]: [{ senderId: myId, recipientId: otherUserId }, { senderId: otherUserId, recipientId: myId }] },
      include: [{ model: User, as: "sender", attributes: ["id", "username"] }, { model: User, as: "recipient", attributes: ["id", "username"] }],
      order: [["createdAt", "ASC"]],
    });
    res.json(messages);
  } catch (error) {
    console.error("Error fetching direct messages:", error);
    res.status(500).json({ message: "Server error fetching direct messages." });
  }
};

const createDirectMessage = async (req, res) => {
  try {
    const { recipientId, message } = req.body;
    const trimmedMessage = message?.trim();
    if (!recipientId || !trimmedMessage) return res.status(400).json({ message: "recipientId and message are required." });
    const recipient = await User.findByPk(recipientId);
    if (!recipient) return res.status(404).json({ message: "Recipient not found." });
    const newMessage = await DirectMessage.create({ senderId: req.user.id, recipientId, message: trimmedMessage });
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error sending direct message:", error);
    res.status(500).json({ message: "Server error sending direct message." });
  }
};

module.exports = { getDirectMessages, createDirectMessage };
