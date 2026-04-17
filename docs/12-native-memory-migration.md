# 12 - Native OpenClaw Memory Migration

This repo now includes a migration path from `memory-hybrid` to OpenClaw's bundled native memory stack.

The migration target is evidence-based:

- Use `memory-core` as the OpenClaw memory slot.
- Export `memory-hybrid` SQLite facts into bounded Markdown files under `~/.openclaw/workspace/memory`.
- Let OpenClaw re-embed those Markdown files with `openclaw memory index --force`.
- Do not import or copy LanceDB vectors into the native index. LanceDB vectors are derivative cache data, not portable source-of-truth memory.

## Current Recommendation

The builtin `memory-core` backend is viable as the low-maintenance replacement for `memory-hybrid`.

Evidence from the 2026-04-16 migration trial:

- `1,893` hybrid facts exported from `~/.openclaw/memory/facts.db`.
- Export was split into `9` bounded `hybrid-import-*.md` files.
- Native memory indexed `81` memory files and `1,228` chunks for the `main` agent.
- The 22-query parity set returned hits for every query with native memory.
- Median native search latency was about `14.3s`, compared with about `33.4s` for the actual `hybrid-mem search` CLI baseline.

Remaining difference: native memory returns document chunks. It does not preserve `memory-hybrid lookup` as a first-class entity/key database query. If exact entity/key lookup remains important, keep the exported JSONL/manifest or a read-only compatibility helper.

## Export Command

From this repo:

```bash
node scripts/export-hybrid-to-openclaw-memory.mjs \
  --source ~/.openclaw/memory/facts.db \
  --out ~/.openclaw/memory/migration/hybrid-export-$(date +%Y%m%d-%H%M%S) \
  --write-workspace-memory \
  --workspace-memory-dir ~/.openclaw/workspace/memory \
  --max-markdown-bytes 200000 \
  --max-rows-per-file 300
```

Dry-run first:

```bash
node scripts/export-hybrid-to-openclaw-memory.mjs \
  --source ~/.openclaw/memory/facts.db \
  --out /tmp/hybrid-export-check \
  --max-markdown-bytes 200000 \
  --max-rows-per-file 300 \
  --dry-run
```

The exporter writes:

- `hybrid-facts.jsonl`: full row-preserving JSONL.
- `hybrid-import-<category>-<date>[-part-N].md`: native-indexable Markdown.
- `manifest.json`: counts, output paths, chunking config, and SHA-256 checksums.

## Native Config Shape

OpenClaw 2026.4.15 validates the Ollama base URL under `memorySearch.remote.baseUrl`, not top-level `memorySearch.baseUrl`.

```json
{
  "agents": {
    "defaults": {
      "memorySearch": {
        "enabled": true,
        "provider": "ollama",
        "model": "nomic-embed-text",
        "remote": {
          "baseUrl": "http://localhost:11434/v1"
        },
        "query": {
          "hybrid": {
            "enabled": true,
            "vectorWeight": 0.7,
            "textWeight": 0.3,
            "mmr": {
              "enabled": true,
              "lambda": 0.7
            },
            "temporalDecay": {
              "enabled": true,
              "halfLifeDays": 30
            }
          }
        },
        "cache": {
          "enabled": true
        }
      }
    }
  },
  "plugins": {
    "slots": {
      "memory": "memory-core"
    },
    "entries": {
      "memory-core": {
        "enabled": true
      }
    }
  }
}
```

`agents.defaults.memorySearch.enabled = true` changes the default behavior for every agent inheriting `agents.defaults`. Add explicit per-agent overrides if an agent should remain stateless.

## Reindex And Verify

```bash
openclaw config validate
openclaw gateway restart
openclaw gateway status --json
openclaw memory index --force
openclaw memory status --deep
openclaw memory search --query "timezone preference"
```

Expected signs:

- Provider is `ollama`.
- Model is `nomic-embed-text`.
- Vector dimensions are `768`.
- Imported files appear as `memory/hybrid-import-*.md`.
- `Dirty: no` after indexing.

## Rollback

Keep the pre-migration backup until the new backend has survived a monitoring window.

Rollback shape:

```bash
set -euo pipefail
BACKUP="$HOME/.openclaw/backups/memory-modernization-<timestamp>"
cp "$BACKUP/openclaw.json" "$HOME/.openclaw/openclaw.json"
rsync -a "$BACKUP/memory/facts.db"* "$HOME/.openclaw/memory/"
rsync -a --delete "$BACKUP/memory/lancedb/" "$HOME/.openclaw/memory/lancedb/"
rsync -a --delete "$BACKUP/extensions/memory-hybrid/" "$HOME/.openclaw/extensions/memory-hybrid/"
openclaw config validate
openclaw gateway restart
openclaw gateway status --json
```

Do not delete `facts.db*` or `lancedb/` during the migration.
