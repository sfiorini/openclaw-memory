import { homedir } from "node:os";
import { join } from "node:path";

export const DECAY_CLASSES = [
  "permanent",
  "stable",
  "active",
  "session",
  "checkpoint",
] as const;
export type DecayClass = (typeof DECAY_CLASSES)[number];

/** TTL defaults in seconds per decay class. null = never expires. */
export const TTL_DEFAULTS: Record<DecayClass, number | null> = {
  permanent: null,
  stable: 90 * 24 * 3600,   // 90 days
  active: 14 * 24 * 3600,   // 14 days
  session: 24 * 3600,       // 24 hours
  checkpoint: 4 * 3600,     // 4 hours
};

export type HybridMemoryConfig = {
  embedding: {
    provider: "ollama";
    model: string;
    baseUrl: string;
    dimensions: number;
  };
  lanceDbPath: string;
  sqlitePath: string;
  autoCapture: boolean;
  autoRecall: boolean;
};

export const MEMORY_CATEGORIES = [
  "preference",
  "fact",
  "decision",
  "entity",
  "other",
] as const;
export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

const DEFAULT_PROVIDER = "ollama";
const DEFAULT_MODEL = "nomic-embed-text";
const DEFAULT_BASE_URL = "http://localhost:11434/v1";
const DEFAULT_LANCE_PATH = join(homedir(), ".openclaw", "memory", "lancedb");
const DEFAULT_SQLITE_PATH = join(homedir(), ".openclaw", "memory", "facts.db");

const EMBEDDING_DIMENSIONS: Record<string, number> = {
  "nomic-embed-text": 768,
  "all-minilm": 384,
};

export function vectorDimsForModel(model: string, explicitDimensions?: number): number {
  if (
    typeof explicitDimensions === "number" &&
    Number.isInteger(explicitDimensions) &&
    explicitDimensions > 0
  ) {
    return explicitDimensions;
  }
  const dims = EMBEDDING_DIMENSIONS[model];
  if (!dims) throw new Error(`Unsupported embedding model: ${model}`);
  return dims;
}

export const hybridConfigSchema = {
  parse(value: unknown): HybridMemoryConfig {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("memory-hybrid config required");
    }
    const cfg = value as Record<string, unknown>;

    const embedding = cfg.embedding as Record<string, unknown> | undefined;
    if (!embedding || typeof embedding !== "object") {
      throw new Error("embedding config is required");
    }

    let provider: "ollama" = DEFAULT_PROVIDER;
    if (typeof embedding.provider === "string") {
      if (embedding.provider !== "ollama") {
        throw new Error(`Unsupported embedding provider: ${embedding.provider}`);
      }
      provider = embedding.provider;
    }
    const model =
      typeof embedding.model === "string" ? embedding.model : DEFAULT_MODEL;
    const dimensions = vectorDimsForModel(
      model,
      typeof embedding.dimensions === "number" ? embedding.dimensions : undefined,
    );
    const baseUrl =
      typeof embedding.baseUrl === "string" && embedding.baseUrl.trim()
        ? embedding.baseUrl.trim().replace(/\/+$/, "")
        : DEFAULT_BASE_URL;

    return {
      embedding: {
        provider,
        model,
        baseUrl,
        dimensions,
      },
      lanceDbPath:
        typeof cfg.lanceDbPath === "string" ? cfg.lanceDbPath : DEFAULT_LANCE_PATH,
      sqlitePath:
        typeof cfg.sqlitePath === "string" ? cfg.sqlitePath : DEFAULT_SQLITE_PATH,
      autoCapture: cfg.autoCapture !== false,
      autoRecall: cfg.autoRecall !== false,
    };
  },
};
