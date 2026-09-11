const express = require("express");
const { getMessages, createMessage } = require("../controllers/messageController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

if (false) {

const Message = require("../models/Message");
const Channel = require("../models/Channel");
const ChannelMember = require("../models/ChannelMember");
const authMiddleware = require("../middleware/authMiddleware");

router.use(authMiddleware);

// Checks whether the logged-in user is a member of the given channel name.
// Returns the Channel row if they are, otherwise null.
const getChannelIfMember = async (userId, channelName) => {
  if (typeof channelName !== "string" || !channelName.trim()) {
    return null;
  }

  const channel = await Channel.findOne({ where: { name: channelName } });
  if (!channel) return null;

  const membership = await ChannelMember.findOne({
    where: { userId, channelId: channel.id },
  });

  return membership ? channel : null;
};


// GET messages by channel
router.get("/", async (req, res) => {
  try {

    const { channel } = req.query;

    const validChannel = await getChannelIfMember(req.user.id, channel);

    if (!validChannel) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this channel.",
      });
    }

    const messages = await Message.findAll({
      where: {
        channel: validChannel.name,
      },
    });

    res.json(messages);

  } catch (error) {

    console.error("Error fetching messages:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch messages",
    });
  }
});


// POST a new message
router.post("/", async (req, res) => {
  try {

    const { message, channel } = req.body;

    const validChannel = await getChannelIfMember(req.user.id, channel);

    if (!validChannel) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this channel.",
      });
    }

    const trimmedMessage = message?.trim();

    if (!trimmedMessage) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty.",
      });
    }

    const newMessage = await Message.create({
      sender: req.user.username,
      userId: req.user.id,
      message: trimmedMessage,
      channel: validChannel.name,
    });

    res.status(201).json({
      success: true,
      message: "Message saved successfully!",
      data: newMessage,
    });

  } catch (error) {

    console.error("Error saving message:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save message",
    });
  }
});


}

router.use(authMiddleware);
router.get("/", getMessages);
router.post("/", createMessage);

module.exports = router;
