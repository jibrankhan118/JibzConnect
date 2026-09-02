const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");
const Message = require("./Message");

const Reaction = sequelize.define("Reaction", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  messageId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Messages",
      key: "id",
    },
    onDelete: "CASCADE", // your good addition — kept from your original
  },

  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Users",
      key: "id",
    },
    onDelete: "CASCADE", // your good addition — kept from your original
  },

  emoji: {
    type: DataTypes.STRING,
    allowNull: false,
  },
},
{
  // Prevents the same user reacting with the same emoji twice on one message.
  // Clicking the same emoji again triggers a DELETE instead of a duplicate INSERT.
  indexes: [
    {
      unique: true,
      fields: ["messageId", "userId", "emoji"],
    },
  ],
});

// Associations — lets us include username alongside each reaction
Reaction.belongsTo(User, { foreignKey: "userId" });
Reaction.belongsTo(Message, { foreignKey: "messageId" });
Message.hasMany(Reaction, { foreignKey: "messageId" });

module.exports = Reaction;