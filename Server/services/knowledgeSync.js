

const KnowledgeDocument = require("../models/KnowledgeDocument");
const sequelize = require("../config/database");
const { scanProject } = require("./projectScanner");

const apiKey = process.env.OPENROUTER_API_KEY;

const CHUNK_SIZE = 6000;

function splitIntoChunks(content) {
  const chunks = [];

  for (let i = 0; i < content.length; i += CHUNK_SIZE) {
    chunks.push(content.slice(i, i + CHUNK_SIZE));
  }

  return chunks;
}
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

async function syncProjectKnowledge() {
  if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY is not configured.");
}

  const files = scanProject();

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const file of files) {
    const existingDocuments = await KnowledgeDocument.findAll({
      where: {
        sourcePath: file.sourcePath,
      },
      order: [["chunkIndex", "ASC"]],
    });

    const existingHash = existingDocuments[0]?.fileHash;

    // File has not changed
    if (
      existingDocuments.length > 0 &&
      existingHash === file.fileHash
    ) {
      skipped++;
      continue;
    }

    // Delete old chunks if file changed
    if (existingDocuments.length > 0) {
      await KnowledgeDocument.destroy({
        where: {
          sourcePath: file.sourcePath,
        },
      });
    }

    const chunks = splitIntoChunks(file.content);

    for (let index = 0; index < chunks.length; index++) {
      const chunk = chunks[index];

      const title = `${file.sourcePath} - chunk ${index + 1}`;

      const embedding = await generateEmbedding(chunk);

      if (!embedding) {
        throw new Error(
          `Failed to generate embedding for ${file.sourcePath}`
        );
      }

      const document = await KnowledgeDocument.create({
        title,
        content: chunk,
        sourceType: "code",
        sourcePath: file.sourcePath,
        chunkIndex: index,
        fileHash: file.fileHash,
      });

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
    }

    if (existingDocuments.length > 0) {
      updated++;
    } else {
      added++;
    }
  }

  return {
    totalFiles: files.length,
    added,
    updated,
    skipped,
  };
}

module.exports = {
  syncProjectKnowledge,
};