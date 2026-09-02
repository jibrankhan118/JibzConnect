const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

const UserPresence = sequelize.define("UserPresence", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "Users", key: "id" },
    onDelete: "CASCADE",
    unique: true,
  },

  isOnline: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  lastSeen: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },

  currentChannel: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  isTyping: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

UserPresence.belongsTo(User, { foreignKey: "userId" });
User.hasOne(UserPresence, { foreignKey: "userId" });

module.exports = UserPresence;
