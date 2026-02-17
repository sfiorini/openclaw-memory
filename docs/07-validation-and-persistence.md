# 07 - Validation and Persistence Tests

## Restart Gateway

```bash
docker compose restart openclaw-gateway
```

## Verify Plugin Initialization

```bash
docker compose logs openclaw-gateway | rg "memory-hybrid: initialized"
```

## Baseline Memory Stats

```bash
docker compose exec openclaw-cli openclaw hybrid-mem stats
```

## Insert Deterministic Test Memory

```bash
docker compose exec openclaw-cli sh -lc 'mkdir -p /home/node/.openclaw/memory && printf -- "- My rollback-test preference is tmux\n" > /home/node/.openclaw/memory/$(date +%F).md && openclaw hybrid-mem extract-daily --days 1 && openclaw hybrid-mem lookup user'
```

## Persistence Checks

```bash
docker compose restart
docker compose exec openclaw-cli openclaw hybrid-mem lookup user

docker compose up -d --force-recreate
docker compose exec openclaw-cli openclaw hybrid-mem lookup user
```

Expected:

- Lookup still returns inserted fact after restart and recreate.
