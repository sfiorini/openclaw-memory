# 11 - Legacy Hybrid Memory CLI Reference

This document lists all available `hybrid-mem` CLI commands for legacy/compatibility use.

For Stefano's current install, `memory-hybrid` is no longer active at runtime. Native OpenClaw memory is exposed through `openclaw memory ...` with `memory-core` as the memory slot owner.

Use this document when:

- rolling back to `memory-hybrid`
- inspecting the old SQLite/LanceDB data
- maintaining a separate legacy hybrid install

Use `docs/12-native-memory-migration.md` for the native runtime commands.

## Usage

Legacy Docker commands run through the gateway container:

```bash
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem <command> [options]
```

On a local host install where the legacy plugin is still active, the equivalent shape is:

```bash
openclaw hybrid-mem <command> [options]
```

If `memory-hybrid` has been disabled or removed from `plugins.entries`, these commands are expected not to be available through the active gateway.

## Commands

### stats

Show memory statistics with decay breakdown.

```bash
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem stats
```

Output includes:
- Total facts count
- Counts by category (preference, fact, decision, entity, other)
- Counts by decay class (permanent, stable, active, session, checkpoint)
- LanceDB vector count

### lookup

Exact entity lookup in SQLite.

```bash
# Lookup facts for a specific entity
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem lookup user
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem lookup Stef
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem lookup OpenClaw
```

### search

Search memories across both SQLite and LanceDB backends.

```bash
# Semantic search (uses LanceDB vectors)
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem search "docker configuration"
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem search "preferences"
```

Returns both exact matches (SQLite) and semantic matches (LanceDB).

### extract-daily

Extract structured facts from daily memory files.

```bash
# Extract from last 14 days
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem extract-daily --days 14

# Extract from last 7 days
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem extract-daily --days 7
```

This command:
- Scans workspace daily files in `~/.openclaw/workspace/memory/YYYY-MM-DD.md`
- Falls back to legacy files in `~/.openclaw/memory/YYYY-MM-DD.md`
- Parses each file for facts
- Stores in SQLite with FTS5
- Generates embeddings for LanceDB

### prune

Remove expired facts and decay aging confidence.

```bash
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem prune
```

Removes facts that have exceeded their expiration time based on decay class.

### backfill-decay

Re-classify existing facts with auto-detected decay classes.

```bash
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem backfill-decay
```

Useful if you want to re-analyze existing facts and assign proper decay classes.

### checkpoint

Save or restore a pre-flight checkpoint.

```bash
# Save a checkpoint
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem checkpoint --action save --intent "before major changes"

# Restore from checkpoint
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem checkpoint --action restore
```

Checkpoints auto-expire after 4 hours.

## Database Paths

- **SQLite**: `~/.openclaw/memory/facts.db`
- **LanceDB**: `~/.openclaw/memory/lancedb/`

## Backup

To backup memory databases:

```bash
# Create backup
docker compose exec openclaw-gateway sh -c 'cd /home/node/.openclaw/memory && cp facts.db facts.db.bak-$(date +%F)'

# Or from host (if config dir is mounted)
cp "${OPENCLAW_CONFIG_DIR}/memory/facts.db" "${OPENCLAW_CONFIG_DIR}/memory/facts.db.bak-$(date +%F)"
```

## Troubleshooting

If commands fail with "plugin not loaded":

1. Confirm you actually intend to run legacy `memory-hybrid`; native `memory-core` installs should not load this plugin.
2. Check plugin files exist in `/home/node/.openclaw/extensions/memory-hybrid/`
3. Check `openclaw.json` has `plugins.slots.memory = "memory-hybrid"` for a legacy runtime, or restore the M1 backup before rollback testing
4. Restart the gateway: `docker compose restart openclaw-gateway`
5. Check logs: `docker compose logs openclaw-gateway | grep memory-hybrid`

For native memory checks, use:

```bash
openclaw memory status --deep
openclaw memory index --force
openclaw memory search --query "timezone preference"
```

Expected native runtime shape:

- `plugins.slots.memory = "memory-core"`
- `memory.backend = "builtin"`
- `plugins.entries.memory-core.enabled = true`
- no `plugins.entries.memory-hybrid` entry
- no `plugins.entries.active-memory` entry unless a separate Active Memory trial is being run
