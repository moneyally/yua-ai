// 📂 src/batch/run-signal-generators.js
// 🔥 PHASE 9 BATCH — NORMALIZE + SIGNAL (SSOT FINAL)

import pg from "pg";
import { normalizeRawEvent } from "../ai/phase9/normalize/raw-to-normalized.js";
import { generateSignals } from "../ai/phase9/signal/signal-generator.js";

const { Client } = pg;

const BATCH_SIZE = 500;

async function main() {
  console.log("[BATCH] Phase9 normalize + signal started");

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    /* =====================================================
       1️⃣ RAW → NORMALIZED
    ===================================================== */
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
    } else {
      console.log(
        `[BATCH] Normalizing ${rawEvents.length} raw events`
      );

      for (const raw of rawEvents) {
        try {
          // 🔒 SSOT: normalizeRawEvent 내부에서 INSERT 수행
          await normalizeRawEvent(client, raw);
        } catch (e) {
          console.warn("[BATCH][NORMALIZE_SKIP]", {
            eventId: raw.event_id,
            error: String(e),
          });
        }
      }
    }

    /* =====================================================
       2️⃣ NORMALIZED → SIGNAL
    ===================================================== */
    const { rows: normalizedEvents } = await client.query(
      `
      SELECT n.*
      FROM phase9_normalized_events n
      LEFT JOIN phase9_signal_instances s
        ON s.normalized_id = n.id
      WHERE s.id IS NULL
      ORDER BY n.created_at ASC
      LIMIT $1
      `,
      [BATCH_SIZE]
    );

    if (normalizedEvents.length === 0) {
      console.log("[BATCH] No normalized events to signal");
    } else {
      console.log(
        `[BATCH] Generating signals for ${normalizedEvents.length} events`
      );

      for (const norm of normalizedEvents) {
        try {
          await generateSignals(client, norm);
        } catch (e) {
          console.warn("[BATCH][SIGNAL_SKIP]", {
            normalizedId: norm.id,
            error: String(e),
          });
        }
      }
    }

    console.log("[BATCH] Phase9 batch finished");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[BATCH][FATAL]", err);
  process.exit(1);
});
