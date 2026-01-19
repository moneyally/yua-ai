// 📂 src/ai/phase9/signal/signal-generator.ts
// 🔥 PHASE 9 — SIGNAL GENERATOR (SSOT)
// - rule-based only
// - deterministic
// - batch-safe

import type { Client } from "pg";

type NormalizedRow = {
  id: number;
  intent: string;
  has_text: boolean;
  has_image: boolean;
  is_multimodal: boolean;
  confidence: number | null;
};

export async function generateSignals(
  client: Client,
  normalized: NormalizedRow
): Promise<void> {
  const signals: {
    key: string;
    value: number;
    weight: number;
  }[] = [];

  // 🔒 RULE 1: multimodal boost
  if (normalized.is_multimodal) {
    signals.push({
      key: "MULTIMODAL_INPUT",
      value: 1,
      weight: 0.6,
    });
  }

  // 🔒 RULE 2: low confidence guard
  if (
    typeof normalized.confidence === "number" &&
    normalized.confidence < 0.6
  ) {
    signals.push({
      key: "LOW_CONFIDENCE",
      value: normalized.confidence,
      weight: 0.8,
    });
  }

  // 🔒 RULE 3: continuation expansion
  if (normalized.intent === "continuation") {
    signals.push({
      key: "CONTINUATION_FLOW",
      value: 1,
      weight: 0.4,
    });
  }

  // 🔒 RULE 4: image-only design hint
  if (normalized.has_image && !normalized.has_text) {
    signals.push({
      key: "IMAGE_ONLY_INPUT",
      value: 1,
      weight: 0.7,
    });
  }

  for (const s of signals) {
    await client.query(
      `
      INSERT INTO phase9_signal_instances (
        normalized_id,
        signal_key,
        signal_value,
        signal_weight
      )
      VALUES ($1,$2,$3,$4)
      ON CONFLICT DO NOTHING
      `,
      [normalized.id, s.key, s.value, s.weight]
    );
  }
}

