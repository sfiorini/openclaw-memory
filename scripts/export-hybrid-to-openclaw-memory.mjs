#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DEFAULT_MAX_MARKDOWN_BYTES = 200_000;
const DEFAULT_MAX_ROWS_PER_FILE = 300;

const HELP = `Usage: export-hybrid-to-openclaw-memory.mjs --source <path> --out <dir> [options]

Export memory-hybrid SQLite facts into JSONL plus bounded Markdown files that
native OpenClaw memory-core can index from workspace/memory.

Options:
  --source <path>                  Path to memory-hybrid facts.db
  --out <dir>                      Output directory for manifest, JSONL, and Markdown
  --write-workspace-memory         Also copy Markdown files into the workspace memory dir
  --workspace-memory-dir <dir>     Workspace memory dir for --write-workspace-memory
  --max-markdown-bytes <bytes>     Max approximate bytes per Markdown file (default: ${DEFAULT_MAX_MARKDOWN_BYTES})
  --max-rows-per-file <rows>       Max rows per Markdown file (default: ${DEFAULT_MAX_ROWS_PER_FILE})
  --dry-run                        Read and summarize only; do not write output files
  --help                           Show this help
`;

export function parseArgs(argv) {
  const opts = {
    source: null,
    out: null,
    writeWorkspaceMemory: false,
    workspaceMemoryDir: path.join(process.env.HOME || '', '.openclaw', 'workspace', 'memory'),
    maxMarkdownBytes: DEFAULT_MAX_MARKDOWN_BYTES,
    maxRowsPerFile: DEFAULT_MAX_ROWS_PER_FILE,
    dryRun: false,
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
    } else if (arg === '--source') {
      opts.source = argv[++i];
    } else if (arg === '--out') {
      opts.out = argv[++i];
    } else if (arg === '--write-workspace-memory') {
      opts.writeWorkspaceMemory = true;
    } else if (arg === '--workspace-memory-dir') {
      opts.workspaceMemoryDir = argv[++i];
    } else if (arg === '--max-markdown-bytes') {
      opts.maxMarkdownBytes = Number(argv[++i]);
    } else if (arg === '--max-rows-per-file') {
      opts.maxRowsPerFile = Number(argv[++i]);
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!opts.help) {
    if (!opts.source) throw new Error('Missing required --source <path>');
    if (!opts.out) throw new Error('Missing required --out <dir>');
    if (!Number.isFinite(opts.maxMarkdownBytes) || opts.maxMarkdownBytes < 500) {
      throw new Error('--max-markdown-bytes must be a number >= 500');
    }
    if (!Number.isInteger(opts.maxRowsPerFile) || opts.maxRowsPerFile < 1) {
      throw new Error('--max-rows-per-file must be a positive integer');
    }
  }

  return opts;
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function sqlJson(dbPath, sql) {
  const result = spawnSync('sqlite3', ['-json', dbPath, sql], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 200 });
  if (result.status !== 0) {
    throw new Error(`sqlite3 failed: ${result.stderr || result.stdout}`);
  }
  return JSON.parse(result.stdout || '[]');
}

function readFacts(dbPath) {
  return sqlJson(dbPath, `
    select
      id,
      text,
      category,
      importance,
      entity,
      key,
      value,
      source,
      created_at,
      decay_class,
      expires_at,
      last_confirmed_at,
      confidence
    from facts
    order by category, coalesce(entity, ''), coalesce(key, ''), created_at, id;
  `);
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = row[key] || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function safeMetadataValue(value) {
  return String(value ?? '')
    .replaceAll('--', '- -')
    .replaceAll('\n', ' ')
    .replaceAll('\r', ' ')
    .replaceAll('"', '&quot;')
    .trim();
}

function slug(value) {
  return String(value || 'other')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'other';
}

function markdownForRows({ category, part, rows, exportedAt, manifestPathForDisplay }) {
  const titlePart = part > 1 ? ` - Part ${part}` : '';
  const lines = [
    `# Hybrid Memory Import - ${category} - ${exportedAt.slice(0, 10)}${titlePart}`,
    '',
    'Source: memory-hybrid facts.db',
    `Rows in file: ${rows.length}`,
    `Generated: ${exportedAt}`,
    `Manifest: ${manifestPathForDisplay}`,
    '',
    `## ${category}`,
    ''
  ];

  let currentHeading = null;
  for (const row of rows) {
    const heading = [row.entity || 'unscoped', row.key || 'general'].join(' / ');
    if (heading !== currentHeading) {
      lines.push(`### ${heading}`, '');
      currentHeading = heading;
    }
    lines.push(`- ${String(row.text).replace(/\s+/g, ' ').trim()}`);
    lines.push(`  <!-- hybrid:id=${safeMetadataValue(row.id)} category=${safeMetadataValue(row.category)} entity=${safeMetadataValue(row.entity)} key=${safeMetadataValue(row.key)} source=${safeMetadataValue(row.source)} importance=${safeMetadataValue(row.importance)} decay=${safeMetadataValue(row.decay_class)} expires_at=${safeMetadataValue(row.expires_at)} last_confirmed_at=${safeMetadataValue(row.last_confirmed_at)} confidence=${safeMetadataValue(row.confidence)} created_at=${safeMetadataValue(row.created_at)} -->`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function chunkRowsByCategory(rows, opts, exportedAt, manifestPathForDisplay) {
  const byCategory = new Map();
  for (const row of rows) {
    const category = row.category || 'other';
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(row);
  }

  const chunks = [];
  for (const [category, categoryRows] of [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    let part = 1;
    let current = [];

    const flush = () => {
      if (current.length === 0) return;
      const markdown = markdownForRows({ category, part, rows: current, exportedAt, manifestPathForDisplay });
      chunks.push({ category, part, rows: current, markdown });
      part += 1;
      current = [];
    };

    for (const row of categoryRows) {
      current.push(row);
      const markdown = markdownForRows({ category, part, rows: current, exportedAt, manifestPathForDisplay });
      if (current.length >= opts.maxRowsPerFile || Buffer.byteLength(markdown, 'utf8') >= opts.maxMarkdownBytes) {
        flush();
      }
    }
    flush();
  }
  return chunks;
}

function markdownFileName(chunk, exportedAt, totalPartsForCategory) {
  const date = exportedAt.slice(0, 10);
  const partSuffix = totalPartsForCategory > 1 ? `-part-${chunk.part}` : '';
  return `hybrid-import-${slug(chunk.category)}-${date}${partSuffix}.md`;
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

function safeOpenClawVersion() {
  const result = spawnSync('openclaw', ['--version'], { encoding: 'utf8' });
  if (result.status !== 0) return 'unknown';
  return result.stdout.trim() || 'unknown';
}

function validateWrittenOutputs({ jsonlPath, plannedMarkdown, expectedRows }) {
  const jsonlRows = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n').filter(Boolean).length;
  if (jsonlRows !== expectedRows) {
    throw new Error(`JSONL row count mismatch: expected ${expectedRows}, wrote ${jsonlRows}`);
  }

  for (const item of plannedMarkdown) {
    if (!fs.existsSync(item.outPath)) {
      throw new Error(`Missing Markdown output: ${item.outPath}`);
    }
    if (Buffer.byteLength(fs.readFileSync(item.outPath), 'utf8') === 0) {
      throw new Error(`Empty Markdown output: ${item.outPath}`);
    }
  }
}

export function exportHybridFacts(options) {
  const source = path.resolve(options.source);
  const outDir = path.resolve(options.out);
  if (!fs.existsSync(source)) throw new Error(`Source database not found: ${source}`);

  const exportedAt = new Date().toISOString();
  const rows = readFacts(source);
  const manifestPath = path.join(outDir, 'manifest.json');
  const jsonlPath = path.join(outDir, 'hybrid-facts.jsonl');
  const manifestPathForDisplay = manifestPath;
  const chunks = chunkRowsByCategory(rows, options, exportedAt, manifestPathForDisplay);

  const categoryPartCounts = {};
  for (const chunk of chunks) {
    categoryPartCounts[chunk.category] = Math.max(categoryPartCounts[chunk.category] || 0, chunk.part);
  }

  const plannedMarkdown = chunks.map((chunk) => {
    const fileName = markdownFileName(chunk, exportedAt, categoryPartCounts[chunk.category]);
    return {
      chunk,
      fileName,
      outPath: path.join(outDir, fileName),
      workspacePath: path.join(path.resolve(options.workspaceMemoryDir), fileName)
    };
  });

  if (options.dryRun) {
    return {
      dryRun: true,
      source,
      exportedAt,
      counts: {
        total: rows.length,
        byCategory: countBy(rows, 'category'),
        byDecayClass: countBy(rows, 'decay_class')
      },
      plannedMarkdownPaths: plannedMarkdown.map((item) => item.outPath)
    };
  }

  fs.mkdirSync(outDir, { recursive: true });
  writeJsonl(jsonlPath, rows);

  for (const item of plannedMarkdown) {
    fs.writeFileSync(item.outPath, item.chunk.markdown);
  }

  validateWrittenOutputs({ jsonlPath, plannedMarkdown, expectedRows: rows.length });

  if (options.writeWorkspaceMemory) {
    fs.mkdirSync(options.workspaceMemoryDir, { recursive: true });
    for (const item of plannedMarkdown) {
      fs.copyFileSync(item.outPath, item.workspacePath);
    }
  }

  const markdownSha256ByPath = {};
  for (const item of plannedMarkdown) {
    markdownSha256ByPath[item.outPath] = sha256File(item.outPath);
  }

  const manifest = {
    source: {
      sqlitePath: source,
      exportedAt,
      openclawVersion: safeOpenClawVersion(),
      sourceSha256: sha256File(source)
    },
    counts: {
      total: rows.length,
      byCategory: countBy(rows, 'category'),
      byDecayClass: countBy(rows, 'decay_class')
    },
    outputs: {
      jsonlPath,
      markdownPaths: plannedMarkdown.map((item) => item.outPath),
      workspaceMemoryPaths: options.writeWorkspaceMemory ? plannedMarkdown.map((item) => item.workspacePath) : []
    },
    checksums: {
      jsonlSha256: sha256File(jsonlPath),
      markdownSha256ByPath
    },
    chunking: {
      maxRowsPerFile: options.maxRowsPerFile,
      maxMarkdownBytes: options.maxMarkdownBytes
    }
  };

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function main() {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help) {
      process.stdout.write(HELP);
      return;
    }
    const result = exportHybridFacts(opts);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();
