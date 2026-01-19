// 🔥 PHASE 9 BATCH — EMBEDDING GENERATOR (SSOT FINAL)

import pg from "pg";
import { generateEventEmbeddings } from "../ai/phase9/embedding/event-embedding-generator.js";
import { generateMemoryEmbeddings } from "../ai/phase9/embedding/memory-embedding-generator.js";

const { Client } = pg;
const BATCH_SIZE = 200;

async function main() {
  console.log("[BATCH] Phase9 embedding started");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    /* =====================================================
       1️⃣ NORMALIZED EVENT → EVENT EMBEDDING
    ===================================================== */
    const { rows: eventRows } = await client.query(
      `
      SELECT n.id,
             n.intent,
             n.has_text,
             n.has_image,
             n.is_multimodal,
             r.payload
      FROM phase9_normalized_events n
      JOIN phase9_raw_event_log r
        ON r.event_id = n.event_id
      LEFT JOIN phase9_event_embeddings e
        ON e.normalized_id = n.id
      WHERE e.id IS NULL
      ORDER BY n.created_at ASC
      LIMIT $1
      `,
      [BATCH_SIZE]
    );

    if (eventRows.length > 0) {
      console.log(
        `[BATCH] Generating ${eventRows.length} event embeddings`
      );
      await generateEventEmbeddings(client, eventRows);
    } else {
      console.log("[BATCH] No event embeddings to generate");
    }

    /* =====================================================
       2️⃣ MEMORY → MEMORY EMBEDDING
    ===================================================== */
    const { rows: memoryRows } = await client.query(
      `
      SELECT m.id, m.scope, m.content
      FROM memory_records m
      LEFT JOIN phase9_memory_embeddings e
        ON e.memory_record_id = m.id
      WHERE e.id IS NULL
      ORDER BY m.created_at ASC
      LIMIT $1
      `,
      [BATCH_SIZE]
    );

    if (memoryRows.length > 0) {
      console.log(
        `[BATCH] Generating ${memoryRows.length} memory embeddings`
      );
      await generateMemoryEmbeddings(client, memoryRows);
    } else {
      console.log("[BATCH] No memory embeddings to generate");
    }

    console.log("[BATCH] Phase9 embedding finished");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[BATCH][FATAL]", err);
  process.exit(1);
});

