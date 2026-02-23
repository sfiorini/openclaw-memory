# 08 - Troubleshooting

## `pull access denied for openclaw`

Your `OPENCLAW_IMAGE` points to a missing image tag.
Use a valid image tag from your existing deployment or build/provide one before continuing.

## `memory-hybrid` does not initialize

Check:

- Plugin files exist in container path:
  - `/home/node/.openclaw/extensions/memory-hybrid`
- `openclaw.json` has `plugins.slots.memory = "memory-hybrid"` and `plugins.entries.memory-hybrid.enabled = true`
- `OPENAI_API_KEY` is present in runtime env

## `better-sqlite3` build fails

Your runtime image likely lacks native build deps.
Install toolchain in image (python3, make, compiler), rebuild image, and retry install.

## `hybrid-mem` commands not found

Possible causes:

- Plugin not loaded
- Dependency install failed
- Wrong CLI invocation path for your compose setup

Use the known-good invocation first:

```bash
docker compose exec openclaw-gateway ./openclaw.mjs hybrid-mem stats
```

If this works but `docker compose run --rm openclaw-cli hybrid-mem stats` fails, keep using the gateway `./openclaw.mjs` command path in this environment.

## Rollback

```bash
cp docker-compose.yml.bak docker-compose.yml
cp .env.bak .env
cp "${OPENCLAW_CONFIG_DIR}/openclaw.json.bak" "${OPENCLAW_CONFIG_DIR}/openclaw.json"
docker compose up -d
```
