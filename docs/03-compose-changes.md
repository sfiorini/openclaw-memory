# 03 - Compose Changes (Existing Installation)

## No Additional Plugin Volume Needed

Do not add an extra plugin-specific bind mount when plugin files are placed under:

- `${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid`

## Keep Existing Config/Data Mount

Do not remove your existing config mount (typically `${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw`).
That same mount provides:

- memory databases (`/home/node/.openclaw/memory`)
- plugin extensions (`/home/node/.openclaw/extensions/*`)

## Validate

```bash
docker compose config | rg -n "/home/node/.openclaw|openclaw-gateway|openclaw-cli"
```

Expected:

- Both services show the config mount target `/home/node/.openclaw`.
