# 06 - Dependency Install (Inside Existing Docker Setup)

## Start/Restart Services

```bash
docker compose up -d
```

## Toolchain Preflight (for `better-sqlite3`)

```bash
docker compose exec openclaw-cli sh -lc 'python3 --version && make --version && (g++ --version || clang++ --version)'
```

If this fails, your image lacks build tools. Extend your base image to add build deps, then retry.

## Install Plugin Dependencies

```bash
docker compose exec openclaw-cli sh -lc 'cd /usr/lib/node_modules/openclaw/extensions/memory-hybrid && npm install'
```

## Install `better-sqlite3` in OpenClaw Home

```bash
docker compose exec openclaw-cli sh -lc 'cd /home/node/.openclaw && npm install better-sqlite3'
```

## Version Check

```bash
docker compose exec openclaw-cli sh -lc 'cd /usr/lib/node_modules/openclaw/extensions/memory-hybrid && npm ls @sinclair/typebox better-sqlite3 @lancedb/lancedb openai'
```
