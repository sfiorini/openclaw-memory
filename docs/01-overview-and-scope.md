# 01 - Overview and Scope

## Goal

Maintain `memory-hybrid` as historical compatibility and migration tooling, and document how to migrate existing hybrid data to OpenClaw native memory.

For Stefano's current OpenClaw install, the active runtime target is:

- memory slot owner: `memory-core`
- backend: builtin
- embeddings: Ollama `nomic-embed-text`
- memory source of truth: Markdown files under `~/.openclaw/workspace/memory`
- `memory-hybrid`: disabled after migration, retained in backups/source for rollback and export workflows

The older legacy path in this repo can still add `memory-hybrid` to an existing OpenClaw Docker deployment with durable storage for:

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
- Exporting `memory-hybrid` facts into native OpenClaw memory Markdown files
- Recording the final native-memory decision and rollback path

## Out of Scope

- Replacing your entire OpenClaw deployment
- Windows container path flow
- Running QMD, Active Memory, or Dreaming as defaults for Stefano's current install

## Current Recommendation

Use native `memory-core` with the builtin backend for the active runtime.

Keep `memory-hybrid` only for:

- rollback to the previous runtime
- inspecting historical `facts.db` data
- exporting hybrid facts through `scripts/export-hybrid-to-openclaw-memory.mjs`

Do not keep the obsolete `hybrid-mem extract-daily` cron job enabled after native memory is verified.

## Deployment Model

The legacy `memory-hybrid` guide assumes your existing compose has runtime and CLI services (for example `openclaw-gateway` and `openclaw-cli`).
For plugin CLI commands in this guide, use the gateway container with `./openclaw.mjs`.

This guide assumes both services already mount your OpenClaw config dir:

- Host: `${OPENCLAW_CONFIG_DIR}`
- Container: `/home/node/.openclaw`

Place plugin files on the host at:

- `${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid`

They will be available in containers at:

- `/home/node/.openclaw/extensions/memory-hybrid`
