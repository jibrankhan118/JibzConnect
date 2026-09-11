const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { createKnowledgeDocument, searchKnowledge, syncKnowledge } = require("../controllers/knowledgeController");

const router = express.Router();
router.post("/", authMiddleware, createKnowledgeDocument);
router.post("/search", authMiddleware, searchKnowledge);
router.post("/sync-test", authMiddleware, syncKnowledge);

module.exports = router;
