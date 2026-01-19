// 📂 src/ai/phase9/normalize/raw-to-normalized.js
// 🔥 PHASE 9 — RAW → NORMALIZED (SSOT)
// - deterministic
// - idempotent
// - NO decision / NO learning

/**
 * @param {import("pg").Client} client
 * @param {{
 *   event_id: string,
 *   workspace_id: string,
 *   thread_id: number | null,
 *   actor: string,
 *   event_kind: string,
 *   phase: string,
 *   payload: any
 * }} raw
 */
export async function normalizeRawEvent(client, raw) {
  const payload = raw.payload ?? {};

  const hasText =
    typeof payload?.messageLength === "number"
      ? payload.messageLength > 0
      : typeof payload?.text === "string" &&
        payload.text.trim().length > 0;

  const hasImage =
    payload?.stage === "image_input" ||
    payload?.hasImage === true ||
    payload?.message === "[IMAGE_INPUT]";

  const isMultimodal = hasText && hasImage;

  let intent = "question";

  // 🔒 SSOT: rule-only intent inference
  if (raw.event_kind === "decision") intent = "decision";
  else if (raw.phase === "execution") intent = "continuation";
  else if (raw.event_kind === "error") intent = "error";
  else if (hasImage && !hasText) intent = "design";

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
    ON CONFLICT (event_id) DO NOTHING
    `,
    [
      raw.event_id,
      raw.workspace_id,
      raw.thread_id,
      intent,
      null, // turn_intent: Phase 10+
      hasText,
      hasImage,
      isMultimodal,
      typeof payload?.confidence === "number"
        ? payload.confidence
        : null,
    ]
  );
}
