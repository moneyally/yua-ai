// 🔥 PHASE 9-4 — DOCUMENT EMBEDDING GENERATOR (SSOT FINAL)
// - write-only
// - deterministic
// - idempotent
// - batch-safe
// - NO retrieval
// - NO judgment

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * document_sections.content → document_section_vectors
 *
 * namespace: memory:rag
 * model: text-embedding-3-large (3072)
 */
export async function generateDocumentEmbeddings(client, rows) {
  for (const row of rows) {
    if (!row.content || !row.content.trim()) continue;

    const inputText = [
      "[DOCUMENT]",
      `document_id: ${row.document_id}`,
      `section_id: ${row.id}`,
      `section_type: ${row.section_type}`,
      "content:",
      row.content.slice(0, 4000),
    ].join("\n");

    const embeddingResult = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: inputText,
    });

    const vector = embeddingResult.data[0].embedding;
    const vectorLiteral = `[${vector.join(",")}]`;

    await client.query(
      `
      INSERT INTO document_section_vectors (
        section_id,
        embedding
      )
      VALUES ($1, $2::vector)
      ON CONFLICT DO NOTHING
      `,
      [row.id, vectorLiteral]
    );
  }
}
