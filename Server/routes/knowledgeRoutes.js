const express = require("express");
const router = express.Router();

const { GoogleGenAI } = require("@google/genai");

const KnowledgeDocument = require("../models/KnowledgeDocument");
const sequelize = require("../config/database");

const { scanProject } = require("../services/projectScanner");
const { syncProjectKnowledge } = require("../services/knowledgeSync");

const apiKey = process.env.GEMINI_API_KEY;

router.post("/", async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        message: "Title and content are required",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        message: "AI service is not configured.",
      });
    }

    // Initialize Gemini client
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // Generate embedding from knowledge content
    const result = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: content.trim(),
    });

    const embedding = result.embeddings?.[0]?.values;

    if (!embedding) {
      return res.status(500).json({
        message: "Failed to generate embedding.",
      });
    }

    // Create knowledge document
    const document = await KnowledgeDocument.create({
      title,
      content,
    });

    // Store embedding in PostgreSQL pgvector column
    await sequelize.query(
      `
      UPDATE public."KnowledgeDocuments"
      SET embedding = CAST(:embedding AS vector)
      WHERE id = :id
      `,
      {
        replacements: {
          embedding: `[${embedding.join(",")}]`,
          id: document.id,
        },
      }
    );

    res.status(201).json({
      message: "Knowledge document created and embedding stored successfully",
      documentId: document.id,
      embeddingDimensions: embedding.length,
    });
  } catch (error) {
    console.error("Error creating knowledge document:", error);

    res.status(500).json({
      message: "Failed to create knowledge document",
      error: error.message,
    });
  }
});


/*
====================================================
POST /search
Search similar knowledge using pgvector
====================================================
*/

router.post("/search", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        message: "Query is required",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        message: "AI service is not configured.",
      });
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // Generate embedding for the user's query
    const result = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: query.trim(),
    });

    const queryEmbedding = result.embeddings?.[0]?.values;

    if (!queryEmbedding) {
      return res.status(500).json({
        message: "Failed to generate query embedding",
      });
    }

    // Search PostgreSQL using cosine distance
    const [results] = await sequelize.query(
      `
      SELECT
        id,
        title,
        content,
        1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
      FROM public."KnowledgeDocuments"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> CAST(:embedding AS vector)
      LIMIT 5
      `,
      {
        replacements: {
          embedding: `[${queryEmbedding.join(",")}]`,
        },
      }
    );

    res.status(200).json({
      success: true,
      query,
      results,
    });
  } catch (error) {
    console.error("Error searching knowledge:", error);

    res.status(500).json({
      message: "Failed to search knowledge",
      error: error.message,
    });
  }
});

/*
====================================================
POST /ask
RAG: Search knowledge + ask Gemini
====================================================
*/

router.post("/ask", async (req, res) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        message: "Query is required",
      });
    }

    if (!apiKey) {
      return res.status(500).json({
        message: "AI service is not configured.",
      });
    }

    // Initialize Gemini
    const ai = new GoogleGenAI({
      apiKey: apiKey,
    });

    // -----------------------------------------
    // 1. Generate embedding for user's question
    // -----------------------------------------

    const embeddingResult = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: query.trim(),
    });

    const queryEmbedding = embeddingResult.embeddings?.[0]?.values;

    if (!queryEmbedding) {
      return res.status(500).json({
        message: "Failed to generate query embedding",
      });
    }

    // -----------------------------------------
    // 2. Search PostgreSQL for relevant knowledge
    // -----------------------------------------

    const [results] = await sequelize.query(
      `
      SELECT
        id,
        title,
        content,
        1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
      FROM public."KnowledgeDocuments"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> CAST(:embedding AS vector)
      LIMIT 5
      `,
      {
        replacements: {
          embedding: `[${queryEmbedding.join(",")}]`,
        },
      }
    );

    // -----------------------------------------
    // 3. Check if knowledge was found
    // -----------------------------------------

    if (results.length === 0) {
      return res.status(200).json({
        success: true,
        answer: "I could not find relevant information in the knowledge base.",
        sources: [],
      });
    }

    // -----------------------------------------
    // 4. Prepare retrieved knowledge
    // -----------------------------------------

    const context = results
      .map((item) => {
        return `Title: ${item.title}\nContent: ${item.content}`;
      })
      .join("\n\n");

    // -----------------------------------------
    // 5. Send question + retrieved knowledge
    //    to Gemini
    // -----------------------------------------

    const prompt = `
You are the AI assistant for JibzConnect.

Answer the user's question using ONLY the information provided
in the knowledge base below.

If the answer cannot be found in the knowledge base,
say that you do not have enough information.

Knowledge Base:
${context}

User Question:
${query.trim()}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    // -----------------------------------------
    // 6. Return Gemini's answer
    // -----------------------------------------

    return res.status(200).json({
      success: true,
      answer: response.text,
      sources: results,
    });

  } catch (error) {
    console.error("Error in RAG ask:", error);

    return res.status(500).json({
      message: "Failed to process RAG request",
      error: error.message,
    });
  }
});

router.post("/sync-test", async (req, res) => {
  try {
    const result = await syncProjectKnowledge();

    res.json({
      success: true,
      message: "Knowledge sync completed successfully.",
      result,
    });
  } catch (error) {
    console.error("Knowledge sync error:", error);

    res.status(500).json({
      success: false,
      message: "Knowledge sync failed.",
      error: error.message,
    });
  }
});

router.get("/scan-test", async (req, res) => {
  try {
    const files = scanProject();

    res.status(200).json({
      success: true,
      totalFiles: files.length,
      files: files.map((file) => ({
        sourcePath: file.sourcePath,
        fileHash: file.fileHash,
        contentLength: file.content.length,
      })),
    });
  } catch (error) {
    console.error("Scanner test error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to scan project",
      error: error.message,
    });
  }
});
router.post("/sync-test", async (req, res) => {
  try {
    const result = await syncProjectKnowledge();

    res.json({
      success: true,
      message: "Knowledge sync completed successfully.",
      result,
    });
  } catch (error) {
    console.error("Knowledge sync error:", error);

    res.status(500).json({
      success: false,
      message: "Knowledge sync failed.",
      error: error.message,
    });
  }
});

module.exports = router;