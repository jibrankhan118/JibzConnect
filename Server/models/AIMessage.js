const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AIMessage = sequelize.define("AIMessage", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  role: {
    type: DataTypes.ENUM("user", "assistant"),
    allowNull: false,
  },

  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

module.exports = AIMessage;