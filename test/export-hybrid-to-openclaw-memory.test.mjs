import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(repoRoot, 'scripts', 'export-hybrid-to-openclaw-memory.mjs');

function sqlite(dbPath, sql) {
  const result = spawnSync('sqlite3', [dbPath, sql], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}

function createFactsDb(dir) {
  const dbPath = path.join(dir, 'facts.db');
  sqlite(dbPath, `
    create table facts (
      id text primary key,
      text text not null,
      category text not null default 'other',
      importance real not null default 0.7,
      entity text,
      key text,
      value text,
      source text not null default 'conversation',
      created_at integer not null,
      decay_class text not null default 'stable',
      expires_at integer,
      last_confirmed_at integer,
      confidence real not null default 1.0
    );
  `);
  const rows = [
    ['pref-1', 'Stef prefers concise engineering updates.', 'preference', 0.95, 'Stef', 'communication', 'concise', 'test', 1770000000000, 'permanent', null, 1770000000100, 1.0],
    ['fact-1', 'OpenClaw config lives at ~/.openclaw/openclaw.json.', 'fact', 0.8, 'OpenClaw', 'config_path', '~/.openclaw/openclaw.json', 'test', 1770000001000, 'stable', null, null, 0.9],
    ['decision-1', 'Use native memory only after rollback is proven.', 'decision', 0.85, 'memory', 'cutover', 'rollback-first', 'test', 1770000002000, 'active', 1770100000000, null, 0.8],
    ['entity-1', 'QMD is installed on this host.', 'entity', 0.75, 'QMD', 'installed', 'true', 'test', 1770000003000, 'stable', null, null, 0.7]
  ];
  for (const row of rows) {
    const values = row.map((value) => value === null ? 'null' : `'${String(value).replaceAll("'", "''")}'`).join(',');
    sqlite(dbPath, `insert into facts values (${values});`);
  }
  return dbPath;
}

test('exports hybrid facts to JSONL, bounded Markdown, and manifest', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hybrid-export-test-'));
  const dbPath = createFactsDb(dir);
  const outDir = path.join(dir, 'out');
  const workspaceMemoryDir = path.join(dir, 'workspace-memory');

  const result = spawnSync(process.execPath, [
    scriptPath,
    '--source', dbPath,
    '--out', outDir,
    '--write-workspace-memory',
    '--workspace-memory-dir', workspaceMemoryDir,
    '--max-markdown-bytes', '900',
    '--max-rows-per-file', '2'
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);

  const manifestPath = path.join(outDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.counts.total, 4);
  assert.equal(manifest.counts.byCategory.preference, 1);
  assert.equal(manifest.counts.byDecayClass.permanent, 1);
  assert.equal(manifest.chunking.maxRowsPerFile, 2);
  assert.ok(manifest.outputs.jsonlPath.endsWith('hybrid-facts.jsonl'));
  assert.ok(manifest.outputs.markdownPaths.length >= 4);

  const jsonl = fs.readFileSync(path.join(outDir, 'hybrid-facts.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.equal(jsonl.length, 4);
  assert.deepEqual(Object.keys(jsonl[0]).sort(), [
    'category',
    'confidence',
    'created_at',
    'decay_class',
    'entity',
    'expires_at',
    'id',
    'importance',
    'key',
    'last_confirmed_at',
    'source',
    'text',
    'value'
  ]);

  const workspaceFiles = fs.readdirSync(workspaceMemoryDir).filter((name) => name.startsWith('hybrid-import-'));
  assert.ok(workspaceFiles.length >= 4);
  const sampleMarkdown = fs.readFileSync(path.join(workspaceMemoryDir, workspaceFiles.find((name) => name.includes('preference'))), 'utf8');
  assert.match(sampleMarkdown, /^# Hybrid Memory Import - /);
  assert.match(sampleMarkdown, /<!-- hybrid:id=pref-1/);
  assert.match(sampleMarkdown, /category=preference/);
  assert.match(sampleMarkdown, /entity=Stef/);
  assert.match(sampleMarkdown, /key=communication/);
  assert.match(sampleMarkdown, /source=test/);
  assert.match(sampleMarkdown, /importance=0.95/);
  assert.match(sampleMarkdown, /decay=permanent/);
  assert.match(sampleMarkdown, /last_confirmed_at=1770000000100/);
  assert.match(sampleMarkdown, /confidence=1/);
  assert.match(sampleMarkdown, /created_at=1770000000000/);
});

test('help documents every supported flag', () => {
  const result = spawnSync(process.execPath, [scriptPath, '--help'], { encoding: 'utf8' });
  assert.equal(result.status, 0);
  for (const flag of [
    '--source',
    '--out',
    '--write-workspace-memory',
    '--workspace-memory-dir',
    '--max-markdown-bytes',
    '--max-rows-per-file',
    '--dry-run'
  ]) {
    assert.match(result.stdout, new RegExp(flag));
  }
});

test('dry-run summarizes planned export without writing files', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hybrid-export-dry-run-test-'));
  const dbPath = createFactsDb(dir);
  const outDir = path.join(dir, 'out');

  const result = spawnSync(process.execPath, [
    scriptPath,
    '--source', dbPath,
    '--out', outDir,
    '--max-markdown-bytes', '900',
    '--max-rows-per-file', '2',
    '--dry-run'
  ], { encoding: 'utf8' });

  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.equal(summary.dryRun, true);
  assert.equal(summary.counts.total, 4);
  assert.ok(summary.plannedMarkdownPaths.length >= 4);
  assert.equal(fs.existsSync(outDir), false);
});
