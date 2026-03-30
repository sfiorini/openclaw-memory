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

test('memory-hybrid registers the typed memory runtime', () => {
  assert.match(
    source,
    /\.registerMemoryRuntime\s*\(/,
    'memory plugin must register a typed memory runtime so OpenClaw can activate it as the current memory backend',
  );
});

test('memory-hybrid avoids the legacy before_agent_start recall hook', () => {
  assert.equal(
    source.includes('before_agent_start'),
    false,
    'memory recall should use before_prompt_build instead of the legacy before_agent_start hook',
  );
  assert.match(
    source,
    /\.on\("before_prompt_build",/,
    'memory recall hook should register on before_prompt_build',
  );
});
