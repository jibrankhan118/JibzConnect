const { Op } = require("sequelize");
const KnowledgeDocument = require("../models/KnowledgeDocument");
const sequelize = require("../config/database");
const { generateEmbedding, searchKnowledge: searchDocuments, syncProjectKnowledge } = require("../services/knowledgeSync");

const createKnowledgeDocument = async (req, res) => {
  try {
    const title = req.body.title?.trim();
    const content = req.body.content?.trim();
    if (!title || !content) return res.status(400).json({ success: false, message: "Title and content are required." });
    const embedding = await generateEmbedding(content);
    const document = await KnowledgeDocument.create({ title, content, sourceType: "manual", metadata: { scope: "user", userId: req.user.id } });
    await sequelize.query(`UPDATE public."KnowledgeDocuments" SET embedding = CAST(:embedding AS vector) WHERE id = :id`, { replacements: { id: document.id, embedding: `[${embedding.join(",")}]` } });
    return res.status(201).json({ success: true, documentId: document.id, embeddingDimensions: embedding.length });
  } catch (error) {
    console.error("Knowledge document creation failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to create knowledge document." });
  }
};

const searchKnowledge = async (req, res) => {
  try {
    const query = req.body.query?.trim();
    if (!query) return res.status(400).json({ success: false, message: "Query is required." });
    const results = await searchDocuments(query, req.user.id);
    return res.json({ success: true, query, results });
  } catch (error) {
    console.error("Knowledge search failed:", error.message);
    return res.status(500).json({ success: false, message: "Failed to search knowledge." });
  }
};

const syncKnowledge = async (req, res) => {
  try {
    const result = await syncProjectKnowledge();
    const storedDocuments = await KnowledgeDocument.count({ where: { sourceType: { [Op.in]: ["public", "channel", "channel_message", "direct_message"] } } });
    return res.json({ success: true, message: "Knowledge synchronization completed.", result, storedDocuments });
  } catch (error) {
    console.error("Knowledge synchronization failed:", error.message);
    return res.status(500).json({ success: false, message: "Knowledge synchronization failed.", error: error.message });
  }
};

module.exports = { createKnowledgeDocument, searchKnowledge, syncKnowledge };
