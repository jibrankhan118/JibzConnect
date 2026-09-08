const KnowledgeDocument = require("../models/KnowledgeDocument");
const sequelize = require("../config/database");

const apiKey = process.env.OPENROUTER_API_KEY;

async function generateEmbedding(text) {
  const response = await fetch(
    "https://openrouter.ai/api/v1/embeddings",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-embedding-001",
        input: text,
        encoding_format: "float",
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error?.message || "OpenRouter embedding request failed."
    );
  }

  return data?.data?.[0]?.embedding;
}

async function searchKnowledge(query, limit = 5) {
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  const embedding = await generateEmbedding(query);

  if (!embedding) {
    throw new Error("Failed to generate query embedding.");
  }

  const embeddingString = `[${embedding.join(",")}]`;

  const [results] = await sequelize.query(
    `
    SELECT
      id,
      title,
      content,
      "sourcePath",
      "chunkIndex",
      1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
    FROM public."KnowledgeDocuments"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> CAST(:embedding AS vector)
    LIMIT :limit
    `,
    {
      replacements: {
        embedding: embeddingString,
        limit,
      },
    }
  );

  console.log("RAG SEARCH QUERY:", query);
console.log("RAG SEARCH RESULTS:", results);

  // Only keep project knowledge that is actually relevant
  const relevantResults = results.filter(
    (item) => Number(item.similarity) >= 0.60
  );

  return relevantResults;
}

module.exports = {
  searchKnowledge,
};