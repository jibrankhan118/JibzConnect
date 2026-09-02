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

  channel: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "General",
  },
});

module.exports = Message;