# 10 - Automated Memory Jobs (Optional)

After completing the core installation, you may want to automate memory extraction and snapshot capture.

## Overview

Two cron jobs are recommended:

1. **memory-store-snapshot** - Periodically stores high-signal facts from conversation context
2. **hybrid-mem-extract-daily** - Daily extraction from memory files with a lookback window

## Why Automate?

- **Continuous capture**: Don't rely on manual extraction
- **Background processing**: Memory files get processed without user intervention
- **Persistent memory**: Facts accumulate over time, improving recall

## Job 1: Memory Store Snapshot

Captures durable facts (preferences, decisions, entities) from recent conversation context.

**Recommended schedule**: Every 30 minutes

**Payload**:
```
Review recent conversation context and store only high-signal, durable facts using memory_store (preferences, decisions, stable facts, entities). Avoid noisy chatter and duplicates. Keep entries concise and human-usable for lookup.
```

**Cron configuration**:
```json
{
  "name": "memory-store-snapshot-every-30m",
  "schedule": {
    "kind": "every",
    "everyMs": 1800000
  },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Review recent conversation context and store only high-signal, durable facts using memory_store (preferences, decisions, stable facts, entities). Avoid noisy chatter and duplicates. Keep entries concise and human-usable for lookup."
  },
  "delivery": {
    "mode": "none"
  }
}
```

## Job 2: Hybrid Memory Extraction

Extracts memories from `MEMORY.md` and daily memory files into SQLite and LanceDB.

**Recommended schedule**: Daily at midnight (your timezone)

**Payload command**:
```bash
cd /opt/homebrew/lib/node_modules/openclaw && ./openclaw.mjs hybrid-mem extract-daily --days 14
```

On non-Homebrew installs, use the actual directory that contains `openclaw.mjs`.

**Cron configuration**:
```json
{
  "name": "hybrid-mem-extract-daily-midnight-cst",
  "schedule": {
    "kind": "cron",
    "expr": "0 0 * * *",
    "tz": "America/Chicago"
  },
  "sessionTarget": "isolated",
  "payload": {
    "kind": "agentTurn",
    "message": "Run daily hybrid memory extraction from memory files and report outcome. Use exec to run: cd /opt/homebrew/lib/node_modules/openclaw && ./openclaw.mjs hybrid-mem extract-daily --days 14. Summarize rows added/updated and any errors."
  },
  "delivery": {
    "mode": "none"
  }
}
```

## Delivery Mode

Set `delivery.mode` to control notification behavior:

- `"announce"` - Sends results to your chat (noisy for frequent jobs)
- `"none"` - Runs silently, no notifications (recommended)

To avoid being pinged every 30 minutes, use `delivery.mode: "none"`.

## Adding Jobs via OpenClaw

Use the cron tool or gateway API to add jobs. Example:

```bash
# List existing jobs
docker compose exec openclaw-gateway ./openclaw.mjs cron list

# Add a job (via agent or API)
# See OpenClaw docs for cron management
```

## Testing Jobs Manually

Before relying on automation, test each job:

```bash
# Trigger hybrid-mem extraction manually
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem extract-daily --days 14

# Check memory stats
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem stats
```

## Adjusting the Lookback Window

The `--days 14` flag controls how many days of memory files to scan. Adjust based on your needs:

- `--days 7` - Weekly lookback (faster, less comprehensive)
- `--days 14` - Two-week lookback (recommended balance)
- `--days 30` - Monthly lookback (slower, more comprehensive)

## Timezone

Set `tz` in the schedule to match your local timezone. Common values:

- `"America/Chicago"` - Central US
- `"America/New_York"` - Eastern US
- `"America/Los_Angeles"` - Pacific US
- `"Europe/London"` - UK
- `"UTC"` - Coordinated Universal Time

## Persistence

Cron jobs are stored in the OpenClaw database and persist across container restarts. No additional configuration needed.

## Next

- Run validation in `docs/07-validation-and-persistence.md`
- Seed initial data in `docs/09-seed-from-memory.md`
