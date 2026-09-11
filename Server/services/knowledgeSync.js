const axios = require("axios");
const crypto = require("crypto");
const { Op } = require("sequelize");
const sequelize = require("../config/database");
const KnowledgeDocument = require("../models/KnowledgeDocument");
const Channel = require("../models/Channel");
const ChannelMember = require("../models/channelMember");
const Message = require("../models/Message");
const DirectMessage = require("../models/DirectMessage");

const OPENROUTER_URL = "https://openrouter.ai/api/v1/embeddings";
const EMBEDDING_MODEL = process.env.RAG_EMBEDDING_MODEL || "google/gemini-embedding-001";
const VECTOR_DIMENSIONS = Number(process.env.RAG_VECTOR_DIMENSIONS || 3072);
const CHUNK_SIZE = 1400;
const SIMILARITY_THRESHOLD = Number(process.env.RAG_SIMILARITY_THRESHOLD || 0.55);
const MANAGED_SOURCE_TYPES = ["public", "channel", "channel_message", "direct_message", "code"];

const publicDocuments = [
  { documentKey: "public:channels", title: "JibzConnect channels", content: "Channels are shared spaces in JibzConnect where members discuss a topic or group. A channel has members, and only members can view its messages through the assistant." },
  { documentKey: "public:direct-messages", title: "JibzConnect direct messages", content: "Direct messages are private one-to-one conversations in JibzConnect. The assistant only uses direct messages involving the signed-in user." },
];

function normalizeText(value) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function splitIntoChunks(content, size = CHUNK_SIZE) {
  const text = normalizeText(content);
  const chunks = [];
  for (let start = 0; start < text.length; start += size) chunks.push(text.slice(start, start + size));
  return chunks;
}

async function generateEmbedding(text) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not configured.");
  const response = await axios.post(
    OPENROUTER_URL,
    { model: EMBEDDING_MODEL, input: normalizeText(text), encoding_format: "float" },
    { timeout: 30000, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" } }
  );
  const embedding = response.data?.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || !embedding.length) throw new Error("The embedding provider returned no embedding.");
  if (embedding.length !== VECTOR_DIMENSIONS) throw new Error(`Embedding dimensions (${embedding.length}) do not match the configured vector dimensions (${VECTOR_DIMENSIONS}).`);
  return embedding;
}

function toVector(embedding) {
  return `[${embedding.join(",")}]`;
}

async function storeEmbedding(documentId, embedding) {
  await sequelize.query(
    `UPDATE public."KnowledgeDocuments" SET embedding = CAST(:embedding AS vector) WHERE id = :id`,
    { replacements: { id: documentId, embedding: toVector(embedding) } }
  );
}

async function upsertDocument(document) {
  const content = normalizeText(document.content);
  if (!content) return "skipped";
  const contentHash = crypto.createHash("sha256").update(content).digest("hex");
  const existing = await KnowledgeDocument.findOne({ where: { documentKey: document.documentKey } });
  if (existing && existing.contentHash === contentHash) return "unchanged";

  const embedding = await generateEmbedding(content);
  if (existing) {
    await existing.update({ ...document, content, contentHash });
    await storeEmbedding(existing.id, embedding);
    return "updated";
  }
  const created = await KnowledgeDocument.create({ ...document, content, contentHash });
  await storeEmbedding(created.id, embedding);
  return "created";
}

function documentForChannel(channel) {
  return {
    documentKey: `channel:${channel.id}`,
    title: `Channel: ${channel.name}`,
    content: `Channel named ${channel.name}.`,
    sourceType: "channel",
    metadata: { scope: "channel", channelId: channel.id, channelName: channel.name, createdAt: channel.createdAt },
  };
}

function documentsForMessage(message) {
  const text = normalizeText(message.message);
  if (!text) return [];
  return splitIntoChunks(text).map((chunk, chunkIndex) => ({
    documentKey: `channel-message:${message.id}:${chunkIndex}`,
    title: `Message in ${message.channel}`,
    content: `Channel: ${message.channel}\nAuthor: ${message.sender}\nSent: ${message.createdAt.toISOString()}\nMessage: ${chunk}`,
    sourceType: "channel_message",
    metadata: { scope: "channel", channelName: message.channel, messageId: message.id, chunkIndex, userId: message.userId, timestamp: message.createdAt },
  }));
}

function documentsForDirectMessage(message) {
  const text = normalizeText(message.message);
  if (!text) return [];
  return splitIntoChunks(text).map((chunk, chunkIndex) => ({
    documentKey: `direct-message:${message.id}:${chunkIndex}`,
    title: "Direct message",
    content: `Direct message\nSent: ${message.createdAt.toISOString()}\nMessage: ${chunk}`,
    sourceType: "direct_message",
    metadata: { scope: "dm", participantIds: [message.senderId, message.recipientId], messageId: message.id, chunkIndex, senderId: message.senderId, recipientId: message.recipientId, timestamp: message.createdAt },
  }));
}

async function buildApplicationDocuments() {
  const [channels, messages, directMessages] = await Promise.all([
    Channel.findAll(),
    Message.findAll({ order: [["createdAt", "ASC"]] }),
    DirectMessage.findAll({ order: [["createdAt", "ASC"]] }),
  ]);
  return [
    ...publicDocuments.map((document) => ({ ...document, sourceType: "public", metadata: { scope: "public" } })),
    ...channels.map(documentForChannel),
    ...messages.flatMap(documentsForMessage),
    ...directMessages.flatMap(documentsForDirectMessage),
  ];
}

async function syncProjectKnowledge() {
  const documents = await buildApplicationDocuments();
  const summary = { totalDocuments: documents.length, created: 0, updated: 0, unchanged: 0, skipped: 0, deleted: 0 };
  for (const document of documents) summary[await upsertDocument(document)] += 1;

  const documentKeys = documents.map((document) => document.documentKey);
  const staleWhere = {
    sourceType: { [Op.in]: MANAGED_SOURCE_TYPES },
    documentKey: { [Op.notIn]: documentKeys.length ? documentKeys : ["__no_documents__"] },
  };
  summary.deleted = await KnowledgeDocument.count({ where: staleWhere });
  await KnowledgeDocument.destroy({ where: staleWhere });
  return summary;
}

async function getAccessContext(userId) {
  const memberships = await ChannelMember.findAll({ where: { userId }, attributes: ["channelId"] });
  const channelIds = memberships.map((membership) => membership.channelId);
  const channels = channelIds.length ? await Channel.findAll({ where: { id: { [Op.in]: channelIds } }, attributes: ["id", "name"] }) : [];
  return { userId: Number(userId), channelIds: new Set(channels.map((channel) => Number(channel.id))), channelNames: new Set(channels.map((channel) => channel.name)) };
}

function canAccessDocument(document, access) {
  const metadata = document.metadata || {};
  if (metadata.scope === "public") return true;
  if (metadata.scope === "dm") return Array.isArray(metadata.participantIds) && metadata.participantIds.map(Number).includes(access.userId);
  if (metadata.scope === "channel") return (metadata.channelId && access.channelIds.has(Number(metadata.channelId))) || (metadata.channelName && access.channelNames.has(metadata.channelName));
  if (metadata.scope === "user") return Number(metadata.userId) === access.userId;
  return false;
}

async function searchKnowledge(query, userId, limit = 5) {
  const text = normalizeText(query);
  if (!text || !userId) return [];
  const [embedding, access] = await Promise.all([generateEmbedding(text), getAccessContext(userId)]);
  const [results] = await sequelize.query(
    `SELECT id, title, content, "sourceType", metadata, 1 - (embedding <=> CAST(:embedding AS vector)) AS similarity
     FROM public."KnowledgeDocuments" WHERE embedding IS NOT NULL
     ORDER BY embedding <=> CAST(:embedding AS vector) LIMIT :limit`,
    { replacements: { embedding: toVector(embedding), limit: Math.max(limit * 8, 40) } }
  );
  return results.filter((result) => Number(result.similarity) >= SIMILARITY_THRESHOLD && canAccessDocument(result, access)).slice(0, limit);
}

module.exports = { buildApplicationDocuments, generateEmbedding, searchKnowledge, splitIntoChunks, syncProjectKnowledge };
