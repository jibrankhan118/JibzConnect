const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const MessageRead = sequelize.define("MessageRead", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  messageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "Messages", key: "id" },
    onDelete: "CASCADE",
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "Users", key: "id" },
    onDelete: "CASCADE",
  },

  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  readAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  indexes: [{ unique: true, fields: ["messageId", "userId"] }],
});

module.exports = MessageRead;
