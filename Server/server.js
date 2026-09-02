require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const Channel = require("./models/Channel");
const ChannelMember = require("./models/ChannelMember");
const channelRoutes = require("./routes/channelRoutes");
const DirectMessage = require("./models/DirectMessage");
const directMessageRoutes = require("./routes/directMessageRoutes");
const reactionRoutes = require("./routes/reactionRoutes");
const presenceRoutes = require("./routes/presenceRoutes");
const sequelize = require("./config/database");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");
const aiRoutes = require("./routes/aiRoutes");
const Message = require("./models/Message");
const User = require("./models/User");
const UserPresence = require("./models/UserPresence");
const MessageRead = require("./models/MessageRead");

const app = express();
const PORT = 5000;

const isMemberOfChannel = async (userId, channelName) => {
  if (typeof channelName !== "string" || !channelName.trim()) {
    return { isMember: false, channel: null };
  }
  const channel = await Channel.findOne({ where: { name: channelName } });
  if (!channel) return { isMember: false, channel: null };
  const membership = await ChannelMember.findOne({
    where: { userId, channelId: channel.id },
  });
  return { isMember: !!membership, channel };
};

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

// Track which channel each user is viewing
const userCurrentChannel = {};

app.use(cors());
app.use(express.json());
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/direct-messages", directMessageRoutes);
app.use("/api/reactions", reactionRoutes);
app.use("/api/presence", presenceRoutes);
app.use("/api/ai", aiRoutes);
app.get("/", (req, res) => res.send("JibzConnect API is running!"));

io.on("connection", (socket) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.disconnect();
    return;
  }

  try {
    const decoded = jwt.verify(token, "your_secret_key");
    socket.user = decoded;
  } catch (error) {
    socket.disconnect();
    return;
  }

  socket.join(`user_${socket.user.id}`);

  // Set user online
  (async () => {
    try {
      await UserPresence.findOrCreate({
        where: { userId: socket.user.id },
        defaults: { isOnline: true, lastSeen: new Date() },
      });
      await UserPresence.update(
        { isOnline: true, lastSeen: new Date() },
        { where: { userId: socket.user.id } }
      );
      io.emit("userOnline", {
        userId: socket.user.id,
        username: socket.user.username,
        isOnline: true,
      });
    } catch (error) {
      console.error("Error:", error);
    }
  })();

  socket.on("joinChannel", async (channel) => {
    try {
      const { isMember } = await isMemberOfChannel(socket.user.id, channel);
      if (!isMember) {
        socket.emit("errorMessage", { message: "Not a member" });
        return;
      }
      socket.join(channel);
      userCurrentChannel[socket.user.id] = channel;
      await UserPresence.update(
        { currentChannel: channel },
        { where: { userId: socket.user.id } }
      );
      io.to(channel).emit("userViewingChannel", {
        userId: socket.user.id,
        username: socket.user.username,
        channelName: channel,
      });
    } catch (error) {
      console.error("Error:", error);
    }
  });
//database message saving
  socket.on("sendMessage", async (data) => {
    try {
      const { isMember } = await isMemberOfChannel(socket.user.id, data?.channel);
      if (!isMember) return;
      const messageText = data?.message?.trim();
      if (!messageText) return;
      const savedMessage = await Message.create({
        sender: socket.user.username,
        userId: socket.user.id,
        message: messageText,
        channel: data.channel,
      });
      io.to(data.channel).emit("receiveMessage", savedMessage);

      // Send notifications to users not in this channel
      const channelMembers = await ChannelMember.findAll({
        where: { channelId: (await Channel.findOne({ where: { name: data.channel } })).id },
        attributes: ["userId"],
      });
//Agar ye message bhejne wala banda khud nahi hai 
// aur doosra user currently is channel ko nahi dekh raha, tab usko notification bhejo."
      channelMembers.forEach((member) => {
        if (member.userId !== socket.user.id && userCurrentChannel[member.userId] !== data.channel) {
          io.to(`user_${member.userId}`).emit("messageNotification", {
            senderUsername: socket.user.username,
            channelName: data.channel,
            message: messageText,
            messageId: savedMessage.id,
          });
        }
      });
    } catch (error) {
      console.error("Error:", error);
    }
  });

  socket.on("sendDirectMessage", async (data) => {
    try {
      const recipientId = Number(data?.recipientId);
      const messageText = data?.message?.trim();
      if (!recipientId || !messageText) return;
      const recipient = await User.findByPk(recipientId);
      if (!recipient) return;
      const savedMessage = await DirectMessage.create({
        senderId: socket.user.id,
        recipientId,
        message: messageText,
      });
      const payload = {
        id: savedMessage.id,
        message: savedMessage.message,
        senderId: socket.user.id,
        recipientId,
        senderUsername: socket.user.username,
        createdAt: savedMessage.createdAt,
      };
      io.to(`user_${recipientId}`).emit("receiveDirectMessage", payload);
      io.to(`user_${socket.user.id}`).emit("receiveDirectMessage", payload);

      // Send notification to recipient if not viewing DM with sender
      io.to(`user_${recipientId}`).emit("messageNotification", {
        senderUsername: socket.user.username,
        message: messageText,
        type: "dm",
      });
    } catch (error) {
      console.error("Error:", error);
    }
  });

  socket.on("toggleReaction", async (data) => {
    try {
      const { messageId, emoji, channelName } = data;
      const ALLOWED = ["👍", "❤️", "😂", "😮", "😢", "🔥", "👏", "🎉"];
      if (!ALLOWED.includes(emoji)) return;
      const message = await Message.findByPk(messageId);
      if (!message) return;
      const Reaction = require("./models/Reaction");
      const existing = await Reaction.findOne({
        where: { messageId, userId: socket.user.id, emoji },
      });
      if (existing) await existing.destroy();
      else await Reaction.create({ messageId, userId: socket.user.id, emoji });

      const updatedReactions = await Reaction.findAll({
        where: { messageId },
        include: [{ model: User, attributes: ["id", "username"] }],
      });

      io.to(channelName).emit("reactionUpdated", { messageId, reactions: updatedReactions });

      // Send reaction notification to message author
      if (message.userId !== socket.user.id) {
        io.to(`user_${message.userId}`).emit("reactionNotification", {
          username: socket.user.username,
          emoji,
          messageText: message.message,
          channelName,
          messageId,
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
  });

  socket.on("userTyping", async (data) => {
    const { channelName, isTyping } = data;
    await UserPresence.update(
      { isTyping },
      { where: { userId: socket.user.id } }
    );
    io.to(channelName).emit("userTypingStatus", {
      userId: socket.user.id,
      username: socket.user.username,
      isTyping,
      channelName,
    });
  });

  socket.on("markMessageRead", async (data) => {
    const { messageId, channelName } = data;
    try {
      await MessageRead.findOrCreate({
        where: { messageId, userId: socket.user.id },
        defaults: { isRead: true, readAt: new Date() },
      });
      await MessageRead.update(
        { isRead: true, readAt: new Date() },
        { where: { messageId, userId: socket.user.id } }
      );
      const reads = await MessageRead.findAll({ where: { messageId } });
      io.to(channelName).emit("messageReadReceipt", {
        messageId,
        readCount: reads.filter((r) => r.isRead).length,
        totalUsers: reads.length,
      });
    } catch (error) {
      console.error("Error:", error);
    }
  });

  // DM CALLING
  socket.on("initiateCall", (data) => {
    io.to(`user_${data.recipientId}`).emit("incomingCall", {
      callerId: data.callerId,
      callerName: data.callerName,
      recipientId: data.recipientId,
    });

    // Also emit notification
    io.to(`user_${data.recipientId}`).emit("messageNotification", {
      type: "call",
      from: data.callerName,
    });
  });

  socket.on("acceptCall", (data) => {
    io.to(`user_${data.callerId}`).emit("callAccepted", { recipientId: data.recipientId });
    io.to(`user_${data.recipientId}`).emit("callAccepted", { callerId: data.callerId });
  });

  socket.on("rejectCall", (data) => {
    io.to(`user_${data.callerId}`).emit("callRejected", { recipientId: data.recipientId });
  });

  socket.on("sendOffer", (data) => {
    io.to(`user_${data.recipientId}`).emit("receiveOffer", {
      offer: data.offer,
      senderId: socket.user.id,
    });
  });

  socket.on("sendAnswer", (data) => {
    io.to(`user_${data.recipientId}`).emit("receiveAnswer", {
      answer: data.answer,
      senderId: socket.user.id,
    });
  });

  socket.on("sendICECandidate", (data) => {
    io.to(`user_${data.recipientId}`).emit("receiveICECandidate", {
      candidate: data.candidate,
      senderId: socket.user.id,
    });
  });

  socket.on("endCall", (data) => {
    io.to(`user_${data.recipientId}`).emit("callEnded", { callerId: socket.user.id });
  });

  // CHANNEL CALLING
  socket.on("initiateChannelCall", (data) => {
    const { channelName, callInitiatorId, callInitiatorName } = data;
    const callId = `${channelName}_${Date.now()}`;
    io.to(channelName).emit("incomingChannelCall", {
      callId,
      channelName,
      callInitiatorId,
      callInitiatorName,
    });

    // Notify users not in this channel
    io.emit("messageNotification", {
      type: "channelCall",
      from: callInitiatorName,
      channel: channelName,
    });
  });

  socket.on("joinChannelCall", (data) => {
    const { callId, channelName, userId, userName } = data;
    socket.join(`call_${callId}`);
    io.to(`call_${callId}`).emit("userJoinedCall", { userId, userName, callId });
  });

  socket.on("leaveChannelCall", (data) => {
    const { callId } = data;
    socket.leave(`call_${callId}`);
    io.to(`call_${callId}`).emit("userLeftCall", { userId: socket.user.id });
  });

  socket.on("endChannelCall", (data) => {
    const { callId, channelName } = data;
    io.to(`call_${callId}`).emit("channelCallEnded", { callId });
    io.to(channelName).emit("channelCallEnded", { callId });
  });

  socket.on("disconnect", async () => {
    try {
      delete userCurrentChannel[socket.user.id];
      await UserPresence.update(
        { isOnline: false, lastSeen: new Date() },
        { where: { userId: socket.user.id } }
      );
      io.emit("userOffline", {
        userId: socket.user.id,
        username: socket.user.username,
        isOnline: false,
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error("Error on disconnect:", error);
    }
  });
});

const startServer = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    server.listen(PORT, () => console.log(`Server on port ${PORT}`));
  } catch (error) {
    console.error("Error:", error);
  }
};

startServer();