const Channel = require("../models/Channel");
const ChannelMember = require("../models/ChannelMember");
const User = require("../models/User");

const createChannel = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Channel name is required." });
    const existing = await Channel.findOne({ where: { name: name.trim() } });
    if (existing) return res.status(409).json({ message: "A channel with this name already exists." });
    const channel = await Channel.create({ name: name.trim(), createdBy: req.user.id });
    await ChannelMember.create({ userId: req.user.id, channelId: channel.id, role: "admin" });
    res.status(201).json(channel);
  } catch (error) {
    console.error("Error creating channel:", error);
    res.status(500).json({ message: "Server error creating channel." });
  }
};

const getChannels = async (req, res) => {
  try {
    const channels = await Channel.findAll();
    res.json(channels);
  } catch (error) {
    console.error("Error fetching channels:", error);
    res.status(500).json({ message: "Server error fetching channels." });
  }
};

const getChannelMembers = async (req, res) => {
  try {
    const members = await ChannelMember.findAll({ where: { channelId: req.params.id }, include: [{ model: User, attributes: ["id", "username", "email"] }] });
    res.json(members);
  } catch (error) {
    console.error("Error fetching channel members:", error);
    res.status(500).json({ message: "Server error fetching members." });
  }
};

const addChannelMember = async (req, res) => {
  try {
    const channelId = req.params.id;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required." });
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found." });
    const existing = await ChannelMember.findOne({ where: { channelId, userId } });
    if (existing) return res.status(409).json({ message: "User is already a member of this channel." });
    const membership = await ChannelMember.create({ userId, channelId, role: "member" });
    res.status(201).json(membership);
  } catch (error) {
    console.error("Error adding channel member:", error);
    res.status(500).json({ message: "Server error adding member." });
  }
};

const removeChannelMember = async (req, res) => {
  try {
    const { id: channelId, userId } = req.params;
    const membership = await ChannelMember.findOne({ where: { channelId, userId } });
    if (!membership) return res.status(404).json({ message: "This user is not a member of the channel." });
    if (membership.role === "admin") {
      const adminCount = await ChannelMember.count({ where: { channelId, role: "admin" } });
      if (adminCount <= 1) return res.status(400).json({ message: "Cannot remove the last admin of a channel." });
    }
    await membership.destroy();
    res.json({ message: "User removed from channel." });
  } catch (error) {
    console.error("Error removing channel member:", error);
    res.status(500).json({ message: "Server error removing member." });
  }
};

const updateChannelMemberRole = async (req, res) => {
  try {
    const { id: channelId, userId } = req.params;
    const { role } = req.body;
    if (!["admin", "member"].includes(role)) return res.status(400).json({ message: "Role must be 'admin' or 'member'." });
    const membership = await ChannelMember.findOne({ where: { channelId, userId } });
    if (!membership) return res.status(404).json({ message: "This user is not a member of the channel." });
    membership.role = role;
    await membership.save();
    res.json(membership);
  } catch (error) {
    console.error("Error updating member role:", error);
    res.status(500).json({ message: "Server error updating role." });
  }
};

module.exports = { createChannel, getChannels, getChannelMembers, addChannelMember, removeChannelMember, updateChannelMemberRole };
