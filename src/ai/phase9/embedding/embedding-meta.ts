// 🔥 PHASE 9 — EMBEDDING META (SSOT)
// 이 파일은 "왜 지금은 인덱스를 안 거는지"를 고정한다.
// 임베딩 차원 / 모델 / 인덱스 가능 여부의 단일 진실 원본.

export type EmbeddingModel =
  | "text-embedding-3-large"
  | "text-embedding-3-small";

export type EmbeddingNamespace =
  | "event:text"
  | "event:image"
  | "event:multimodal"
  | "memory:decision"
  | "memory:architecture"
  | "memory:rag"
  | "memory:general";

export type EmbeddingMeta = {
  model: EmbeddingModel;
  dimension: number;
  indexable: boolean;       // Postgres pgvector 기준
  allowedIndexes: Array<"ivfflat" | "hnsw">;
};

/**
 * 🔒 SSOT: 임베딩 모델 메타 정의
 *
 * - Postgres pgvector 기준
 * - ivfflat / hnsw 모두 2000 차원 제한
 * - 3072 차원은 "저장 전용"
 */
export const EMBEDDING_MODEL_META: Record<
  EmbeddingModel,
  EmbeddingMeta
> = {
  "text-embedding-3-large": {
    model: "text-embedding-3-large",
    dimension: 3072,
    indexable: false,          // ❌ 인덱스 불가
    allowedIndexes: [],        // ❌
  },

  "text-embedding-3-small": {
    model: "text-embedding-3-small",
    dimension: 1536,
    indexable: true,           // ✅ 인덱스 가능
    allowedIndexes: ["ivfflat", "hnsw"],
  },
};

/**
 * namespace → 기본 embedding 모델 매핑
 * (Phase 9-4 기준: 전부 large 사용)
 */
export const DEFAULT_EMBEDDING_MODEL_BY_NAMESPACE: Record<
  EmbeddingNamespace,
  EmbeddingModel
> = {
  "event:text": "text-embedding-3-large",
  "event:image": "text-embedding-3-large",
  "event:multimodal": "text-embedding-3-large",

  "memory:decision": "text-embedding-3-large",
  "memory:architecture": "text-embedding-3-large",
  "memory:rag": "text-embedding-3-large",
  "memory:general": "text-embedding-3-large",
};

/**
 * 인덱스 생성 가능 여부 체크 (Phase 9-6에서 사용)
 */
export function canCreateVectorIndex(model: EmbeddingModel): boolean {
  return EMBEDDING_MODEL_META[model].indexable;
}
