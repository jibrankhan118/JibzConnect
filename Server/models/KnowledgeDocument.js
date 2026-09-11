const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const KnowledgeDocument = sequelize.define("KnowledgeDocument", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  documentKey: { type: DataTypes.STRING, allowNull: true },
  title: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  contentHash: { type: DataTypes.STRING, allowNull: true },
  sourceType: { type: DataTypes.STRING, allowNull: true },
  sourcePath: { type: DataTypes.STRING, allowNull: true },
  chunkIndex: { type: DataTypes.INTEGER, allowNull: true },
  fileHash: { type: DataTypes.STRING, allowNull: true },
  metadata: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  embedding: { type: "VECTOR(3072)", allowNull: true },
}, { indexes: [{ fields: ["documentKey"] }, { fields: ["sourceType"] }] });

module.exports = KnowledgeDocument;
