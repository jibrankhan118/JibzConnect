const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const DirectMessage = sequelize.define("DirectMessage", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  senderId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  recipientId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

// Associations - let us pull sender/recipient details (username) alongside each message
DirectMessage.belongsTo(User, { as: "sender", foreignKey: "senderId" });
DirectMessage.belongsTo(User, { as: "recipient", foreignKey: "recipientId" });

module.exports = DirectMessage;