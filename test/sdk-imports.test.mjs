import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const pluginPath = path.resolve('/Users/stefano/.openclaw/workspace/projects/openclaw-memory/openclaw-data/memory-hybrid/index.ts');
const source = fs.readFileSync(pluginPath, 'utf8');

test('memory-hybrid uses split OpenClaw SDK imports', () => {
  assert.equal(source.includes('from "openclaw/plugin-sdk"'), false, 'plugin must not import from the monolithic openclaw/plugin-sdk root');
  assert.match(source, /import type \{\s*OpenClawPluginApi\s*\} from "openclaw\/plugin-sdk\/core";/, 'plugin api type should come from openclaw/plugin-sdk/core');
  assert.match(source, /import \{\s*stringEnum\s*\} from "openclaw\/plugin-sdk\/compat";/, 'stringEnum should come from openclaw/plugin-sdk/compat');
});
