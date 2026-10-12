const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  fullName: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  avatarUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = User;
