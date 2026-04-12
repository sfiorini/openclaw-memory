#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import Database from 'better-sqlite3';
import * as lancedb from '@lancedb/lancedb';

const HOME = os.homedir();
const OPENCLAW_DIR = path.join(HOME, '.openclaw');
const OPENCLAW_JSON = path.join(OPENCLAW_DIR, 'openclaw.json');

const SQLITE_PATH = path.join(OPENCLAW_DIR, 'memory', 'facts.db');
const LANCEDB_PATH = path.join(OPENCLAW_DIR, 'memory', 'lancedb');

const MEMORY_CANDIDATES = [
  path.join(OPENCLAW_DIR, 'MEMORY.md'),
  path.join(OPENCLAW_DIR, 'workspace', 'MEMORY.md'),
];

const DAILY_MEMORY_DIR_CANDIDATES = [
  path.join(OPENCLAW_DIR, 'memory'),
  path.join(OPENCLAW_DIR, 'workspace', 'memory'),
];

const DEFAULT_EMBEDDING = {
  provider: 'ollama',
  model: 'nomic-embed-text',
  baseUrl: 'http://localhost:11434/v1',
  dimensions: 768,
};
const COSINE_THRESHOLD = 0.95;

function pickExistingPath(candidates) {
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function resolveEnvTemplate(value) {
  if (typeof value !== 'string') return value;
  const m = value.match(/^\$\{([A-Z0-9_]+)\}$/i);
  if (!m) return value;
  const envName = m[1];
  return process.env[envName] || '';
}

function loadEmbeddingConfig() {
  if (!fs.existsSync(OPENCLAW_JSON)) {
    throw new Error(`openclaw.json not found at ${OPENCLAW_JSON}`);
  }
  const cfg = readJson(OPENCLAW_JSON);
  const embedding = cfg?.plugins?.entries?.['memory-hybrid']?.config?.embedding || {};
  const provider = embedding.provider || DEFAULT_EMBEDDING.provider;
  const model = embedding.model || DEFAULT_EMBEDDING.model;
  const baseUrl = (embedding.baseUrl || DEFAULT_EMBEDDING.baseUrl).replace(/\/+$/, '');
  const dimensions = Number(embedding.dimensions || DEFAULT_EMBEDDING.dimensions);

  if (provider !== 'ollama') {
    throw new Error(`Unsupported embedding provider for local seed: ${provider}`);
  }
  if (!Number.isInteger(dimensions) || dimensions <= 0) {
    throw new Error(`Invalid embedding dimensions for ${model}: ${embedding.dimensions}`);
  }
  return { provider, model, baseUrl, dimensions };
}

async function createEmbeddings(config, input) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  const headers = { 'content-type': 'application/json' };

  try {
    const resp = await fetch(`${config.baseUrl}/embeddings`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({ model: config.model, input }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      throw new Error(`Embedding request failed (${config.provider}, ${resp.status}): ${body.slice(0, 300)}`);
    }
    const data = await resp.json();
    const rows = data?.data || (Array.isArray(data?.embedding) ? [{ embedding: data.embedding }] : []);
    const vectors = rows.map((row) => row.embedding);
    for (const vector of vectors) {
      if (!Array.isArray(vector)) throw new Error('Embedding response did not contain a vector.');
      if (vector.length !== config.dimensions) {
        throw new Error(`Embedding dimension mismatch for ${config.model}: expected ${config.dimensions}, got ${vector.length}`);
      }
    }
    return vectors;
  } finally {
    clearTimeout(timeout);
  }
}

function ensureSqliteSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS facts (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      importance REAL NOT NULL DEFAULT 0.7,
      entity TEXT,
      key TEXT,
      value TEXT,
      source TEXT NOT NULL DEFAULT 'conversation',
      created_at INTEGER NOT NULL,
      decay_class TEXT NOT NULL DEFAULT 'stable',
      expires_at INTEGER,
      last_confirmed_at INTEGER,
      confidence REAL NOT NULL DEFAULT 1.0
    );
    CREATE INDEX IF NOT EXISTS idx_facts_created ON facts(created_at);
    CREATE INDEX IF NOT EXISTS idx_facts_entity ON facts(entity);
    CREATE INDEX IF NOT EXISTS idx_facts_category ON facts(category);
  `);
}

function cleanLine(line) {
  return line
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+\.\s+/, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .trim();
}

function detectCategory(text, section = '') {
  const t = `${section} ${text}`.toLowerCase();
  if (/(prefer|likes|preference|favorite|wants to be called)/.test(t)) return 'preference';
  if (/(decided|decision|chose|because)/.test(t)) return 'decision';
  if (/(repository|project|skill|service|bot|docker|gateway|timezone|location|remote|path|token|configured|installed|running)/.test(t)) return 'fact';
  if (/(contact|person|stef|luke|telegram handle)/.test(t)) return 'entity';
  return 'other';
}

function normalizeEntityName(entity) {
  if (!entity) return null;
  const e = entity.trim();
  if (!e) return null;

  const lower = e.toLowerCase();
  const aliases = new Map([
    ['ha', 'Home Assistant'],
    ['home assistant', 'Home Assistant'],
    ['openclaw gateway', 'OpenClaw'],
    ['openclaw', 'OpenClaw'],
    ['tts', 'TTS'],
    ['stt', 'STT'],
    ['telegram', 'Telegram'],
    ['whatsapp', 'WhatsApp'],
    ['discord', 'Discord'],
    ['stef', 'Stef'],
    ['luke', 'Luke'],
  ]);
  if (aliases.has(lower)) return aliases.get(lower);

  return e
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function isGenericSection(name) {
  const s = (name || '').trim().toLowerCase();
  if (!s) return true;
  return [
    'session',
    'conversation summary',
    'conversation history',
    'conversation info',
    'runtime',
    'source',
  ].includes(s);
}

function inferEntityFromText(raw, section = '', subsection = '') {
  const t = `${section} ${subsection} ${raw}`.toLowerCase();

  if (/\b(stef|stefano)\b/.test(t) || /^user:\s*/i.test(raw)) return 'Stef';
  if (/\bluke\b/.test(t) || /^assistant:\s*/i.test(raw)) return 'Luke';
  if (/\b(tts|voice id|voice-only|elevenlabs|eleven_v3)\b/.test(t)) return 'TTS';
  if (/\b(stt|scribe|transcrib|whisper)\b/.test(t)) return 'STT';
  if (/\bhome assistant\b|\bha\b/.test(t)) return 'Home Assistant';
  if (/\bopenclaw|gateway\b/.test(t)) return 'OpenClaw';
  if (/\btelegram\b/.test(t)) return 'Telegram';
  if (/\bwhatsapp\b/.test(t)) return 'WhatsApp';
  if (/\bdiscord\b/.test(t)) return 'Discord';

  if (!isGenericSection(subsection)) return normalizeEntityName(subsection);
  if (!isGenericSection(section)) return normalizeEntityName(section);

  return null;
}

function extractStructuredFields(text, section = '', subsection = '') {
  const raw = text.trim();

  let m = raw.match(/^(.+?)['’]s\s+(.+?)\s+is\s+(.+)$/i);
  if (m) {
    return { entity: normalizeEntityName(m[1].trim()), key: m[2].trim().toLowerCase(), value: m[3].trim() };
  }

  m = raw.match(/^I\s+prefer\s+(.+)$/i);
  if (m) return { entity: 'Stef', key: 'prefer', value: m[1].trim() };

  m = raw.match(/^We\s+decided\s+(.+?)\s+because\s+(.+)$/i);
  if (m) return { entity: 'Decision', key: m[1].trim(), value: m[2].trim() };

  const inferredEntity = inferEntityFromText(raw, section, subsection);

  m = raw.match(/^([^:]{2,60}):\s+(.+)$/);
  if (m) {
    const key = m[1].trim().toLowerCase().replace(/\s+/g, '_');
    const value = m[2].trim();
    return { entity: inferredEntity || 'Conversation Summary', key, value };
  }

  return { entity: inferredEntity || 'Conversation Summary', key: null, value: null };
}

function parseMarkdownFacts(content, sourcePath) {
  const lines = content.split(/\r?\n/);
  const facts = [];
  let section = '';
  let subsection = '';
  let inCodeBlock = false;

  for (let line of lines) {
    if (/^```/.test(line.trim())) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    if (/^#\s+/.test(line)) continue;
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      section = cleanLine(h2[1]);
      subsection = '';
      continue;
    }
    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      subsection = cleanLine(h3[1]);
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^-\s+\*\*(session key|session id|source)\*\*:/i.test(trimmed)) {
      // still keep metadata as facts
    }

    const cleaned = cleanLine(trimmed);
    if (!cleaned || cleaned.length < 3) continue;

    // Skip very chatty transcript scaffolding while still parsing important lines
    if (/^(assistant|user):\s*$/i.test(cleaned)) continue;

    const structured = extractStructuredFields(cleaned, section, subsection);
    const category = detectCategory(cleaned, `${section} ${subsection}`);
    facts.push({
      text: cleaned,
      category,
      entity: structured.entity,
      key: structured.key,
      value: structured.value,
      source: sourcePath,
    });
  }

  return facts;
}

function listDailyMemoryFiles(memoryDirs) {
  const dirs = Array.isArray(memoryDirs) ? memoryDirs : [memoryDirs];
  const out = new Set();
  for (const memoryDir of dirs) {
    if (!memoryDir || !fs.existsSync(memoryDir)) continue;
    for (const f of fs.readdirSync(memoryDir)) {
      if (/^\d{4}-\d{2}-\d{2}(?:-[0-9]{4})?\.md$/.test(f)) {
        out.add(path.join(memoryDir, f));
      }
    }
  }
  return [...out].sort();
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return -1;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return -1;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function getOrCreateLanceTable(db, sampleVectorDim = DEFAULT_EMBEDDING.dimensions) {
  try {
    return await db.openTable('memories');
  } catch {
    const row = {
      id: crypto.randomUUID(),
      text: 'seed',
      vector: new Array(sampleVectorDim).fill(0),
      importance: 0.7,
      category: 'other',
      createdAt: Date.now(),
    };
    const table = await db.createTable('memories', [row]);
    // Remove bootstrap row
    await table.delete(`id = '${row.id}'`);
    return table;
  }
}

async function main() {
  const memoryPath = pickExistingPath(MEMORY_CANDIDATES);
  if (!memoryPath) {
    throw new Error(`MEMORY.md not found. Checked: ${MEMORY_CANDIDATES.join(', ')}`);
  }

  const dailyDirs = DAILY_MEMORY_DIR_CANDIDATES.filter((d) => fs.existsSync(d));
  const dailyFiles = listDailyMemoryFiles(dailyDirs);

  const embeddingConfig = loadEmbeddingConfig();

  fs.mkdirSync(path.dirname(SQLITE_PATH), { recursive: true });
  fs.mkdirSync(LANCEDB_PATH, { recursive: true });

  const sqlite = new Database(SQLITE_PATH);
  ensureSqliteSchema(sqlite);

  const ldb = await lancedb.connect(LANCEDB_PATH);
  const table = await getOrCreateLanceTable(ldb, embeddingConfig.dimensions);

  const allFacts = [];
  const memoryText = fs.readFileSync(memoryPath, 'utf8');
  allFacts.push(...parseMarkdownFacts(memoryText, memoryPath));

  for (const f of dailyFiles) {
    const txt = fs.readFileSync(f, 'utf8');
    allFacts.push(...parseMarkdownFacts(txt, f));
  }

  // De-dup within this run by text
  const uniqueByText = new Map();
  for (const fact of allFacts) {
    if (!uniqueByText.has(fact.text)) uniqueByText.set(fact.text, fact);
  }
  const facts = [...uniqueByText.values()];

  const selectByIdentity = sqlite.prepare(`
    SELECT id FROM facts
    WHERE text = @text
      AND IFNULL(entity, '') = IFNULL(@entity, '')
      AND IFNULL(key, '') = IFNULL(@key, '')
      AND IFNULL(value, '') = IFNULL(@value, '')
    LIMIT 1
  `);
  const insertFact = sqlite.prepare(`
    INSERT INTO facts (
      id, text, category, importance, entity, key, value, source, created_at,
      decay_class, expires_at, last_confirmed_at, confidence
    ) VALUES (
      @id, @text, @category, @importance, @entity, @key, @value, @source, @created_at,
      @decay_class, @expires_at, @last_confirmed_at, @confidence
    )
  `);

  const existingVectors = await table.query().limit(200000).toArray();
  const knownVectors = existingVectors
    .filter((r) => Array.isArray(r.vector))
    .map((r) => ({ id: r.id, text: r.text, vector: r.vector }));
  const knownTexts = new Set(existingVectors.map((r) => r.text).filter(Boolean));

  let insertedSqlite = 0;
  let skippedSqlite = 0;
  let insertedLance = 0;
  let skippedLance = 0;

  const pendingLanceRows = [];
  const needsEmbedding = [];

  for (const fact of facts) {
    // SQLite identity de-dup (text + entity + key + value)
    const existing = selectByIdentity.get({
      text: fact.text,
      entity: fact.entity || null,
      key: fact.key || null,
      value: fact.value || null,
    });
    let factId = existing?.id;

    if (!factId) {
      factId = crypto.randomUUID();
      insertFact.run({
        id: factId,
        text: fact.text,
        category: fact.category || 'other',
        importance: 0.7,
        entity: fact.entity || null,
        key: fact.key || null,
        value: fact.value || null,
        source: fact.source,
        created_at: Date.now(),
        decay_class: 'stable',
        expires_at: null,
        last_confirmed_at: null,
        confidence: 1.0,
      });
      insertedSqlite++;
    } else {
      skippedSqlite++;
    }

    // Quick exact-text check for LanceDB before embedding call
    if (knownTexts.has(fact.text)) {
      skippedLance++;
      continue;
    }

    needsEmbedding.push({ factId, fact });
  }

  const BATCH_SIZE = 100;
  for (let i = 0; i < needsEmbedding.length; i += BATCH_SIZE) {
    const batch = needsEmbedding.slice(i, i + BATCH_SIZE);
    const inputs = batch.map((x) => x.fact.text);

    const embeddings = await createEmbeddings(embeddingConfig, inputs);

    for (let j = 0; j < batch.length; j++) {
      const { factId, fact } = batch[j];
      const vector = embeddings[j];
      if (!Array.isArray(vector)) continue;

      let nearDuplicate = false;
      for (const row of knownVectors) {
        const sim = cosineSimilarity(vector, row.vector);
        if (sim >= COSINE_THRESHOLD) {
          nearDuplicate = true;
          break;
        }
      }

      if (nearDuplicate) {
        skippedLance++;
        continue;
      }

      const lanceRow = {
        id: factId,
        text: fact.text,
        vector,
        importance: 0.7,
        category: fact.category || 'other',
        createdAt: Date.now(),
      };

      pendingLanceRows.push(lanceRow);
      knownVectors.push({ id: lanceRow.id, text: lanceRow.text, vector: lanceRow.vector });
      knownTexts.add(lanceRow.text);
      insertedLance++;
    }
  }

  if (pendingLanceRows.length) {
    await table.add(pendingLanceRows);
  }

  sqlite.close();

  console.log('Seed complete');
  console.log(`MEMORY.md: ${memoryPath}`);
  console.log(`Daily memory dirs: ${dailyDirs.length ? dailyDirs.join(', ') : '[none]'}`);
  console.log(`Daily files scanned: ${dailyFiles.length}`);
  console.log(`Facts parsed: ${facts.length}`);
  console.log(`SQLite inserted: ${insertedSqlite}, skipped exact duplicates: ${skippedSqlite}`);
  console.log(`LanceDB inserted: ${insertedLance}, skipped similar (>95% cosine): ${skippedLance}`);
  console.log(`SQLite DB: ${SQLITE_PATH}`);
  console.log(`LanceDB: ${LANCEDB_PATH}`);
}

main().catch((err) => {
  console.error('Seed failed:', err?.message || err);
  process.exit(1);
});
