// 🔥 PHASE 9-4 — EVENT EMBEDDING GENERATOR (SSOT FINAL)
// - write-only
// - deterministic
// - idempotent
// - batch-safe
// - NO retrieval / NO decision

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function buildNamespace(row) {
  if (row.is_multimodal) return "event:multimodal";
  if (row.has_image) return "event:image";
  return "event:text";
}

function buildEmbeddingText(row) {
  const payload = row.payload ?? {};
  const parts = [];

  parts.push("[EVENT]");
  parts.push(`intent: ${row.intent}`);

  if (typeof payload.message === "string") {
    parts.push(`text: ${payload.message.slice(0, 1000)}`);
  }

  if (payload.caption || payload.ocr) {
    parts.push("[IMAGE]");
    if (payload.caption) parts.push(`caption: ${payload.caption}`);
    if (payload.ocr) parts.push(`ocr: ${payload.ocr}`);
  }

  return parts.join("\n");
}

export async function generateEventEmbeddings(client, rows) {
  for (const row of rows) {
    const namespace = buildNamespace(row);
    const inputText = buildEmbeddingText(row);

    if (!inputText.trim()) continue;

    const embeddingResult = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: inputText,
    });

    const vector = embeddingResult.data[0].embedding;

    await client.query(
      `
      INSERT INTO phase9_event_embeddings (
        normalized_id,
        embedding,
        namespace,
        model
      )
      VALUES ($1,$2,$3,$4)
      ON CONFLICT DO NOTHING
      `,
      [
        row.id,
        vector,
        namespace,
        "text-embedding-3-large",
      ]
    );
  }
}

