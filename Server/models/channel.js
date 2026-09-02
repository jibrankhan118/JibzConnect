const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Channel = sequelize.define("Channel", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

module.exports = Channel;