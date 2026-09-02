const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Channel = require("./Channel");

const ChannelMember = sequelize.define(
  "ChannelMember",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    role: {
      type: DataTypes.ENUM("admin", "member"),
      allowNull: false,
      defaultValue: "member",
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["userId", "channelId"],
      },
    ],
  }
);

// Associations
User.belongsToMany(Channel, { through: ChannelMember, foreignKey: "userId" });
Channel.belongsToMany(User, { through: ChannelMember, foreignKey: "channelId" });

ChannelMember.belongsTo(User, { foreignKey: "userId" });
ChannelMember.belongsTo(Channel, { foreignKey: "channelId" });
User.hasMany(ChannelMember, { foreignKey: "userId" });
Channel.hasMany(ChannelMember, { foreignKey: "channelId" });

module.exports = ChannelMember;