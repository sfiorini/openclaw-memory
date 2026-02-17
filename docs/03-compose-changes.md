# 03 - Compose Changes (Existing Installation)

## Add Host Path Variable

In your existing `.env`:

```dotenv
OPENCLAW_MEMORY_HYBRID_DIR=./openclaw-data/memory-hybrid
```

Use an absolute path if preferred.

## Add Plugin Mount to Existing Services

In your existing `docker-compose.yml`, add this volume to both runtime and CLI services:

```yaml
- ${OPENCLAW_MEMORY_HYBRID_DIR}:/usr/lib/node_modules/openclaw/extensions/memory-hybrid
```

Reference snippet:
- `docs/snippets/compose-memory-hybrid-volumes.yml`

## Keep Existing Config/Data Mount

Do not remove your existing config mount (typically `${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw`).
That mount is where memory databases persist.

## Validate

```bash
docker compose config | rg -n "memory-hybrid|openclaw-gateway|openclaw-cli"
```

Expected:
- Both services show the `memory-hybrid` mount target.
