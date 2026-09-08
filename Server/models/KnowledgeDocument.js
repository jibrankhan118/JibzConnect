
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const KnowledgeDocument = sequelize.define("KnowledgeDocument", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  // Tells us what kind of knowledge this is
  // Example: code, documentation, database, application
  sourceType: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Exact project file/path where the knowledge came from
  // Example: Server/routes/channelRoutes.js
  sourcePath: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Used when one file is split into multiple chunks
  chunkIndex: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  // Used to detect whether a source file has changed
  fileHash: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // PostgreSQL pgvector embedding
  embedding: {
    type: "VECTOR(3072)",
    allowNull: true,
  },
});

module.exports = KnowledgeDocument;

