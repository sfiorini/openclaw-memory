import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginPath = path.join(repoRoot, 'openclaw-data', 'memory-hybrid', 'index.ts');
const packagePath = path.join(repoRoot, 'openclaw-data', 'memory-hybrid', 'package.json');
const source = fs.readFileSync(pluginPath, 'utf8');
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

test('memory-hybrid uses split OpenClaw SDK imports', () => {
  assert.match(source, /import\s+\{[^}]*stringEnum[^}]*OpenClawPluginApi[^}]*\}\s+from "openclaw\/plugin-sdk\/core";|import\s+\{[^}]*OpenClawPluginApi[^}]*stringEnum[^}]*\}\s+from "openclaw\/plugin-sdk\/core";/, 'plugin api type and stringEnum should come from openclaw/plugin-sdk/core');
  assert.equal(source.includes('from "openclaw/plugin-sdk/compat"'), false, 'plugin must not import from the unexported openclaw/plugin-sdk/compat path');
  assert.equal(source.includes('from "openclaw/plugin-sdk";'), false, 'plugin must not import stringEnum from the trimmed openclaw/plugin-sdk root');
});

test('memory-hybrid declares OpenClaw as a runtime dependency', () => {
  assert.equal(typeof pkg.dependencies?.openclaw, 'string', 'plugin package must declare an openclaw runtime dependency so extension imports resolve outside the global install tree');
});
