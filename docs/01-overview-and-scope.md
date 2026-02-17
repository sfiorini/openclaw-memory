# 01 - Overview and Scope

## Goal

Add `memory-hybrid` to an existing OpenClaw Docker deployment with durable storage for:

- Plugin code (extension folder)
- Memory data (SQLite and LanceDB under OpenClaw config dir)

## In Scope

- Compose volume changes for existing services
- Plugin file placement and update workflow
- OpenClaw config wiring
- Dependency install (`better-sqlite3`, LanceDB, OpenAI SDK)
- Runtime validation and persistence verification

## Out of Scope

- Replacing your entire OpenClaw deployment
- Windows container path flow
- Alternative memory architectures

## Deployment Model

This guide assumes your existing compose has runtime and CLI services (for example `openclaw-gateway` and `openclaw-cli`).

You will add one extra bind mount to both services:

- Host: `${OPENCLAW_MEMORY_HYBRID_DIR}`
- Container: `/usr/lib/node_modules/openclaw/extensions/memory-hybrid`

This makes plugin files survive container recreation.
