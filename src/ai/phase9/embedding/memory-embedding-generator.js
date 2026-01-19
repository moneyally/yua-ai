// 🔥 PHASE 9-4 — MEMORY EMBEDDING GENERATOR (SSOT FINAL)
// - write-only
// - deterministic
// - idempotent
// - batch-safe
// - NO retrieval / NO judgment

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function mapScopeToNamespace(scope) {
  switch (scope) {
    case "project_decision":
      return "memory:decision";
    case "architecture":
      return "memory:architecture";
    case "rag":
      return "memory:rag";
    default:
      return "memory:general";
  }
}

function buildEmbeddingText(row) {
  return [
    "[MEMORY]",
    `scope: ${row.scope}`,
    "content:",
    row.content.slice(0, 2000),
  ].join("\n");
}

export async function generateMemoryEmbeddings(client, rows) {
  for (const row of rows) {
    if (!row.content || !row.content.trim()) continue;

    const namespace = mapScopeToNamespace(row.scope);
    const inputText = buildEmbeddingText(row);

    const embeddingResult = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: inputText,
    });

const vector = embeddingResult.data[0].embedding;
const vectorLiteral = `[${vector.join(",")}]`;

await client.query(
  `
  INSERT INTO phase9_memory_embeddings (
    memory_record_id,
    embedding,
    namespace,
    model
  )
  VALUES ($1, $2::vector, $3, $4)
  ON CONFLICT DO NOTHING
  `,
  [
    row.id,
    vectorLiteral,
    namespace,
    "text-embedding-3-large",
  ]
);

  }
}

