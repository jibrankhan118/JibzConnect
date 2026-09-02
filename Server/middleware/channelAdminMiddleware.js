const ChannelMember = require("../models/ChannelMember");

// Expects to run AFTER authMiddleware, and on a route with :id as the channel id
const requireChannelAdmin = async (req, res, next) => {
  try {
    const channelId = req.params.id;
    const userId = req.user.id;

    const membership = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    if (!membership || membership.role !== "admin") {
      return res.status(403).json({
        message: "Admins only. You do not have permission to manage this channel.",
      });
    }

    req.channelMembership = membership;
    next();
  } catch (error) {
    console.error("Error checking channel admin permissions:", error);
    res.status(500).json({ message: "Server error checking channel permissions." });
  }
};

module.exports = requireChannelAdmin;