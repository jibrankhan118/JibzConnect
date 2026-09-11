const { Op } = require("sequelize");
const User = require("../models/User");
const DirectMessage = require("../models/DirectMessage");
const Channel = require("../models/Channel");
const ChannelMember = require("../models/ChannelMember");
const Message = require("../models/Message");

const CHANNEL_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9 _-]{1,79}$/;

function failure(action, message) {
  return { success: false, action, message };
}

function success(action, message, data = {}) {
  return { success: true, action, message, ...data };
}

async function findUser(username) {
  if (typeof username !== "string" || !username.trim()) return failure("findUser", "Please provide a username.");
  const user = await User.findOne({ where: { username: { [Op.iLike]: username.trim() } }, attributes: ["id", "username"] });
  return user ? success("findUser", "User found.", { user: { id: user.id, username: user.username } }) : failure("findUser", "I could not find that user.");
}

async function createChannel(userId, channelName) {
  const name = typeof channelName === "string" ? channelName.trim() : "";
  if (!CHANNEL_NAME_PATTERN.test(name)) return failure("createChannel", "Channel names must be 2–80 characters and use letters, numbers, spaces, hyphens, or underscores.");
  const existing = await Channel.findOne({ where: { name: { [Op.iLike]: name } }, attributes: ["id", "name"] });
  if (existing) return failure("createChannel", "A channel with that name already exists.");
  const channel = await Channel.create({ name, createdBy: userId });
  await ChannelMember.create({ userId, channelId: channel.id, role: "admin" });
  return success("createChannel", "Channel created successfully.", { channel: { id: channel.id, name: channel.name } });
}

async function getAdminChannel(userId, channelName, action) {
  const channel = await Channel.findOne({ where: { name: { [Op.iLike]: String(channelName || "").trim() } } });
  if (!channel) return { error: failure(action, "I could not find that channel.") };
  const membership = await ChannelMember.findOne({ where: { userId, channelId: channel.id } });
  if (!membership || membership.role !== "admin") return { error: failure(action, "You must be a channel admin to perform that action.") };
  return { channel, membership };
}

async function deleteChannel(userId, channelName) {
  const result = await getAdminChannel(userId, channelName, "deleteChannel");
  if (result.error) return result.error;
  await Message.destroy({ where: { channel: result.channel.name } });
  await ChannelMember.destroy({ where: { channelId: result.channel.id } });
  await result.channel.destroy();
  return success("deleteChannel", "Channel deleted successfully.", { channelName: result.channel.name });
}

async function addMember(userId, channelName, targetUsername) {
  const result = await getAdminChannel(userId, channelName, "addMember");
  if (result.error) return result.error;
  const target = await findUser(targetUsername);
  if (!target.success) return failure("addMember", target.message);
  const existing = await ChannelMember.findOne({ where: { channelId: result.channel.id, userId: target.user.id } });
  if (existing) return failure("addMember", target.user.username + " is already a member of that channel.");
  await ChannelMember.create({ channelId: result.channel.id, userId: target.user.id, role: "member" });
  return success("addMember", "Member added successfully.", { channelName: result.channel.name, username: target.user.username });
}

async function removeMember(userId, channelName, targetUsername) {
  const result = await getAdminChannel(userId, channelName, "removeMember");
  if (result.error) return result.error;
  const target = await findUser(targetUsername);
  if (!target.success) return failure("removeMember", target.message);
  if (target.user.id === result.channel.createdBy) return failure("removeMember", "The channel creator cannot be removed from the channel.");
  const membership = await ChannelMember.findOne({ where: { channelId: result.channel.id, userId: target.user.id } });
  if (!membership) return failure("removeMember", target.user.username + " is not a member of that channel.");
  if (membership.role === "admin") {
    const adminCount = await ChannelMember.count({ where: { channelId: result.channel.id, role: "admin" } });
    if (adminCount <= 1) return failure("removeMember", "The last channel admin cannot be removed.");
  }
  await membership.destroy();
  return success("removeMember", "Member removed successfully.", { channelName: result.channel.name, username: target.user.username });
}

async function sendMessage(userId, targetUsername, message) {
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return failure("sendMessage", "The message cannot be empty.");
  if (text.length > 5000) return failure("sendMessage", "The message is too long.");
  const target = await findUser(targetUsername);
  if (!target.success) return failure("sendMessage", target.message);
  if (target.user.id === Number(userId)) return failure("sendMessage", "You cannot send a direct message to yourself.");
  const created = await DirectMessage.create({ senderId: userId, recipientId: target.user.id, message: text });
  return success("sendMessage", "Message sent successfully.", { username: target.user.username, messageId: created.id });
}

async function startCall(userId, targetUsername, callType = "voice") {
  if (callType !== "voice") return failure("startCall", "The current JibzConnect call implementation supports voice calls only.");
  const target = await findUser(targetUsername);
  if (!target.success) return failure("startCall", target.message);
  if (target.user.id === Number(userId)) return failure("startCall", "You cannot call yourself.");
  return success("startCall", "Call ready to start.", { target: target.user, callType });
}

const NO_DATA = "";

async function getMyChannels(userId) {
  const memberships = await ChannelMember.findAll({ where: { userId } });
  if (!memberships.length) return NO_DATA;
  const channels = await Channel.findAll({
    where: { id: { [Op.in]: memberships.map((membership) => membership.channelId) } },
    attributes: ["id", "name", "createdBy", "createdAt"],
    order: [["name", "ASC"]],
  });
  return channels.map((channel) => `Channel: ${channel.name} (created ${channel.createdAt ? channel.createdAt.toISOString() : "unknown"})`).join("\n");
}

async function getRecentDMs(userId, username = null) {
  const currentUser = await User.findByPk(userId, { attributes: ["id", "username"] });
  if (!currentUser) return NO_DATA;

  let otherUser = null;
  if (username) {
    otherUser = await User.findOne({ where: { username: { [Op.iLike]: username } }, attributes: ["id", "username"] });
    if (!otherUser) return NO_DATA;
  }

  const where = { [Op.or]: [{ senderId: userId }, { recipientId: userId }] };
  if (otherUser) {
    where[Op.and] = [{ [Op.or]: [{ senderId: userId, recipientId: otherUser.id }, { senderId: otherUser.id, recipientId: userId }] }];
  }

  const messages = await DirectMessage.findAll({ where, order: [["createdAt", "DESC"]], limit: 100 });
  if (!messages.length) return NO_DATA;

  const users = await User.findAll({
    where: { id: { [Op.in]: [...new Set(messages.flatMap((message) => [message.senderId, message.recipientId]))] } },
    attributes: ["id", "username"],
  });
  const usernames = new Map(users.map((user) => [user.id, user.username]));
  return messages.map((message) => {
    const sender = usernames.get(message.senderId) || "Unknown user";
    const recipient = usernames.get(message.recipientId) || "Unknown user";
    const timestamp = message.createdAt ? ` at ${message.createdAt.toISOString()}` : "";
    return `DM${timestamp} — ${sender} → ${recipient}: ${message.message}`;
  }).join("\n");
}

async function getChannelMessages(userId, channelName) {
  if (!channelName) return NO_DATA;
  const channel = await Channel.findOne({ where: { name: { [Op.iLike]: channelName } } });
  if (!channel) return NO_DATA;
  const membership = await ChannelMember.findOne({ where: { userId, channelId: channel.id } });
  if (!membership) return NO_DATA;

  // Message stores the channel name in `channel` in the current schema.
  const messages = await Message.findAll({ where: { channel: channel.name }, order: [["createdAt", "DESC"]], limit: 100 });
  if (!messages.length) return NO_DATA;
  return messages.map((message) => `Channel: ${channel.name}${message.createdAt ? ` at ${message.createdAt.toISOString()}` : ""} — ${message.sender}: ${message.message}`).join("\n");
}

function searchTerms(query) {
  return [...new Set(query.toLowerCase().replace(/[^a-z0-9_ ]/g, " ").split(/\s+/).filter((term) => term.length > 2 && !["find", "message", "messages", "where", "what", "about", "talked", "said", "show", "tell", "the", "and", "with"].includes(term)))];
}

async function searchMessages(userId, query) {
  const terms = searchTerms(query);
  if (!terms.length) return NO_DATA;

  const memberships = await ChannelMember.findAll({ where: { userId }, attributes: ["channelId"] });
  const channels = memberships.length ? await Channel.findAll({ where: { id: { [Op.in]: memberships.map((membership) => membership.channelId) } }, attributes: ["name"] }) : [];
  const channelNames = channels.map((channel) => channel.name);
  const [channelMessages, directMessages] = await Promise.all([
    channelNames.length ? Message.findAll({ where: { channel: { [Op.in]: channelNames } }, order: [["createdAt", "DESC"]], limit: 200 }) : [],
    DirectMessage.findAll({ where: { [Op.or]: [{ senderId: userId }, { recipientId: userId }] }, order: [["createdAt", "DESC"]], limit: 200 }),
  ]);

  const userIds = [...new Set(directMessages.flatMap((message) => [message.senderId, message.recipientId]))];
  const users = userIds.length ? await User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ["id", "username"] }) : [];
  const usernames = new Map(users.map((user) => [user.id, user.username]));
  const matches = [];
  for (const message of channelMessages) {
    const haystack = `${message.channel} ${message.sender} ${message.message}`.toLowerCase();
    if (terms.some((term) => haystack.includes(term))) matches.push(`Channel: ${message.channel}${message.createdAt ? ` at ${message.createdAt.toISOString()}` : ""} — ${message.sender}: ${message.message}`);
  }
  for (const message of directMessages) {
    const haystack = `${usernames.get(message.senderId) || ""} ${usernames.get(message.recipientId) || ""} ${message.message}`.toLowerCase();
    if (terms.some((term) => haystack.includes(term))) matches.push(`DM${message.createdAt ? ` at ${message.createdAt.toISOString()}` : ""} — ${usernames.get(message.senderId) || "Unknown user"} → ${usernames.get(message.recipientId) || "Unknown user"}: ${message.message}`);
  }
  return matches.slice(0, 100).join("\n");
}

module.exports = {
  getMyChannels,
  getRecentDMs,
  getChannelMessages,
  searchMessages,
  findUser,
  createChannel,
  deleteChannel,
  addMember,
  removeMember,
  sendMessage,
  startCall,
};
