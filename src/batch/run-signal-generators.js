// src/batch/run-signal-generators.js
import pg from "pg";
import { normalizeRawEvent } from "../ai/phase9/normalize/raw-to-normalized.js";

const { Client } = pg;

const BATCH_SIZE = 500;

async function main() {
  console.log("[BATCH] Phase9 normalize started");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    // 1️⃣ 아직 normalize 안 된 raw event 가져오기
    const { rows: rawEvents } = await client.query(
      `
      SELECT r.*
      FROM phase9_raw_event_log r
      LEFT JOIN phase9_normalized_events n
        ON n.event_id = r.event_id
      WHERE n.id IS NULL
      ORDER BY r.occurred_at ASC
      LIMIT $1
      `,
      [BATCH_SIZE]
    );

    if (rawEvents.length === 0) {
      console.log("[BATCH] No raw events to normalize");
      return;
    }

    console.log(
      `[BATCH] Normalizing ${rawEvents.length} raw events`
    );

    let success = 0;
    let skipped = 0;

    for (const raw of rawEvents) {
      try {
        const normalized = normalizeRawEvent(raw);
        if (!normalized) {
          skipped++;
          continue;
        }

        await client.query(
          `
          INSERT INTO phase9_normalized_events (
            event_id,
            workspace_id,
            thread_id,
            intent,
            turn_intent,
            has_text,
            has_image,
            is_multimodal,
            confidence
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9
          )
          `,
          [
            raw.event_id,
            raw.workspace_id,
            raw.thread_id ?? null,
            normalized.intent,
            normalized.turnIntent ?? null,
            normalized.hasText,
            normalized.hasImage,
            normalized.isMultimodal,
            normalized.confidence ?? null,
          ]
        );

        success++;
      } catch (e) {
        console.warn("[BATCH][NORMALIZE_SKIP]", {
          eventId: raw.event_id,
          error: String(e),
        });
        skipped++;
      }
    }

    console.log("[BATCH] Phase9 normalize finished", {
      success,
      skipped,
    });
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[BATCH][FATAL]", err);
  process.exit(1);
});
