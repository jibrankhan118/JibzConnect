const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Message = sequelize.define("Message", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  sender: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
    onDelete: "CASCADE",
  },

  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  messageType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "text",
  },

  audioUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  audioMimeType: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  audioDuration: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  channel: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "General",
  },
});

module.exports = Message;
