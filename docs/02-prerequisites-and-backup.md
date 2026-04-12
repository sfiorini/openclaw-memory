# 02 - Prerequisites and Backup

## Prerequisites

- Existing OpenClaw Docker Compose installation
- Access to run `docker compose` commands
- Ability to restart OpenClaw services
- Ollama available from the OpenClaw gateway runtime
- `nomic-embed-text:latest` pulled in Ollama, or another local embedding model with its dimensions configured

## Preflight Checks

Run in your existing OpenClaw compose project:

```bash
docker compose config >/tmp/openclaw-compose-check.txt
docker compose ps
curl -fsS http://localhost:11434/api/tags
```

Expected:

- Compose config renders without error
- Core OpenClaw services are visible
- Ollama lists the selected embedding model from the host where you are running the check

For Docker deployments, set the plugin `baseUrl` to an address reachable from inside the gateway container. On Docker Desktop for macOS this is commonly `http://host.docker.internal:11434/v1`; for a host install or same-network runtime it can be `http://localhost:11434/v1`.

## Backup Before Changes

Back up at least:

- `docker-compose.yml`
- `.env`
- OpenClaw user config (usually `${OPENCLAW_CONFIG_DIR}/openclaw.json`)

Example:

```bash
cp docker-compose.yml docker-compose.yml.bak
cp .env .env.bak
cp "${OPENCLAW_CONFIG_DIR}/openclaw.json" "${OPENCLAW_CONFIG_DIR}/openclaw.json.bak"
```
