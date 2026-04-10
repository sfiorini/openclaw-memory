# 07 - Validation and Persistence Tests

Use gateway plugin CLI syntax for this workflow:

```bash
docker compose exec openclaw-gateway ./openclaw.mjs <command>
```

## Restart Gateway

```bash
docker compose restart openclaw-gateway
```

## Verify Plugin Initialization

```bash
docker compose logs openclaw-gateway | rg "memory-hybrid: initialized"
```

## Verify Normalized Install State

```bash
docker compose exec openclaw-gateway ./openclaw.mjs plugins inspect memory-hybrid --json
docker compose exec openclaw-gateway ./openclaw.mjs doctor --non-interactive
```

Expected:

- `plugins inspect` shows an `install` object for `memory-hybrid`
- `usesLegacyBeforeAgentStart` is `false`
- `compatibility` is empty for `memory-hybrid`
- `doctor` no longer warns that `memory-hybrid` is untracked local code
- `doctor` no longer warns that no active memory plugin is registered
- `doctor` does not emit `memory-hybrid invalid config` warnings

Also verify the plugin-local SDK version matches the host release family:

```bash
docker compose exec openclaw-gateway node -e 'const fs=require("fs"); const p="/home/node/.openclaw/extensions/memory-hybrid/node_modules/openclaw/package.json"; console.log(JSON.parse(fs.readFileSync(p,"utf8")).version)'
```

## Baseline Memory Stats

```bash
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem stats
```

## Insert Deterministic Test Memory

```bash
docker compose exec openclaw-gateway sh -lc 'mkdir -p /home/node/.openclaw/workspace/memory && printf -- "- My rollback-test preference is tmux\n" > /home/node/.openclaw/workspace/memory/$(date +%F).md && ./openclaw.mjs hybrid-mem extract-daily --days 1 && ./openclaw.mjs hybrid-mem lookup user'
```

Legacy fallback also works from `/home/node/.openclaw/memory`, but workspace memory is the preferred location.

## Persistence Checks

```bash
docker compose restart
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem lookup user

docker compose up -d --force-recreate
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem lookup user
```

Expected:

- Lookup still returns inserted fact after restart and recreate.
- `plugins inspect memory-hybrid --json` still shows the install record after restart/recreate

Next:

- Run one-time seeding in `docs/09-seed-from-memory.md`
