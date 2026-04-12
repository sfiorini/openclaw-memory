# 01 - Overview and Scope

## Goal

Add `memory-hybrid` to an existing OpenClaw Docker deployment with durable storage for:

- Plugin code (extension folder)
- Memory data (SQLite and LanceDB under OpenClaw config dir)

## In Scope

- Compose config-mount verification for existing services
- Plugin file placement and update workflow
- OpenClaw config wiring
- Dependency install (`better-sqlite3`, LanceDB, OpenClaw SDK)
- Local embedding runtime wiring through Ollama's OpenAI-compatible `/v1/embeddings` endpoint
- Runtime validation and persistence verification
- Post-install seeding from existing `MEMORY.md` and daily memory files

## Out of Scope

- Replacing your entire OpenClaw deployment
- Windows container path flow
- Alternative memory architectures

## Deployment Model

This guide assumes your existing compose has runtime and CLI services (for example `openclaw-gateway` and `openclaw-cli`).
For plugin CLI commands in this guide, use the gateway container with `./openclaw.mjs`.

This guide assumes both services already mount your OpenClaw config dir:

- Host: `${OPENCLAW_CONFIG_DIR}`
- Container: `/home/node/.openclaw`

Place plugin files on the host at:

- `${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid`

They will be available in containers at:

- `/home/node/.openclaw/extensions/memory-hybrid`
