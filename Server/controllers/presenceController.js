const UserPresence = require("../models/UserPresence");
const User = require("../models/User");

const getAllPresence = async (req, res) => {
  try {
    const presences = await UserPresence.findAll({ include: [{ model: User, attributes: ["id", "username"] }] });
    res.json(presences);
  } catch (error) {
    res.status(500).json({ message: "Error fetching presence" });
  }
};

const getPresenceByUser = async (req, res) => {
  try {
    const presence = await UserPresence.findOne({ where: { userId: req.params.userId }, include: [{ model: User, attributes: ["id", "username"] }] });
    if (!presence) return res.status(404).json({ message: "User not found" });
    res.json(presence);
  } catch (error) {
    res.status(500).json({ message: "Error fetching presence" });
  }
};

const getLastSeen = async (req, res) => {
  try {
    const presence = await UserPresence.findOne({ where: { userId: req.params.userId } });
    if (!presence) return res.status(404).json({ message: "User not found" });
    res.json({ userId: req.params.userId, lastSeen: presence.lastSeen });
  } catch (error) {
    res.status(500).json({ message: "Error fetching last seen" });
  }
};

module.exports = { getAllPresence, getPresenceByUser, getLastSeen };
