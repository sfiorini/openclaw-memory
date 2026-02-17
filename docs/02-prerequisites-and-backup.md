# 02 - Prerequisites and Backup

## Prerequisites

- Existing OpenClaw Docker Compose installation
- Access to run `docker compose` commands
- Ability to restart OpenClaw services
- `OPENAI_API_KEY` available

## Preflight Checks

Run in your existing OpenClaw compose project:

```bash
docker compose config >/tmp/openclaw-compose-check.txt
docker compose ps
```

Expected:

- Compose config renders without error
- Core OpenClaw services are visible

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
