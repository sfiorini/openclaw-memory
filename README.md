# OpenClaw Memory-Hybrid (Compatibility And Migration Tooling)

This repository is documentation-first.

Use it to maintain the historical `memory-hybrid` implementation and to migrate existing hybrid memory data into OpenClaw's bundled native memory stack.

For Stefano's current OpenClaw install, `memory-hybrid` is no longer the active runtime memory provider. The active target is OpenClaw native `memory-core` with the builtin backend, Ollama embeddings, and migrated Markdown memory files under `~/.openclaw/workspace/memory`.

This repo now reflects the OpenClaw 2026.4.15 migration decision:

- native `memory-core` owns the OpenClaw memory slot
- `memory-hybrid` is retained for rollback, historical compatibility, and export tooling
- `scripts/export-hybrid-to-openclaw-memory.mjs` exports existing `facts.db` rows into JSONL plus native-indexable Markdown
- QMD is not the default backend for this install because the trial had lower recall than builtin
- Active Memory and Dreaming remain disabled by default

The legacy plugin path remains documented for rollback or separate installs:

- `memory-hybrid` registers its own typed memory runtime
- auto-recall uses `before_prompt_build`, not legacy `before_agent_start`
- the plugin should be recorded under `plugins.installs` so `openclaw doctor` treats it as tracked installed code
- `hybrid-mem` is the supported CLI for this repo's workflow unless you separately allowlist the bundled `memory-core` plugin
- the plugin-local `openclaw` dependency should stay aligned with the host OpenClaw release family
- `openclaw.plugin.json` should allow empty config during metadata-only plugin introspection; runtime enforcement still happens in `index.ts`
- embeddings are local by default through Ollama's OpenAI-compatible `/v1/embeddings` endpoint, using `nomic-embed-text` at 768 dimensions

## Start Here

1. Read `docs/01-overview-and-scope.md`
2. Run the preflight in `docs/02-prerequisites-and-backup.md`
3. Apply compose updates from `docs/03-compose-changes.md`
4. Install plugin files using `docs/04-plugin-files.md`
5. Configure OpenClaw in `docs/05-openclaw-config.md`
6. Install dependencies in `docs/06-dependency-install.md`
7. Validate and persistence-test with `docs/07-validation-and-persistence.md`
8. Run post-install seeding flow in `docs/09-seed-from-memory.md`
9. (Optional) Set up automated jobs in `docs/10-cron-jobs.md`
10. Read `docs/12-native-memory-migration.md` before deciding whether to run native `memory-core` instead
11. Use `docs/08-troubleshooting.md` if anything fails

## Reference

- `docs/11-cli-reference.md` — Hybrid memory CLI commands
- `docs/12-native-memory-migration.md` — migration path and final native-memory config shape

## What This Repo Provides

- `openclaw-data/memory-hybrid/`: plugin source files (`package.json`, `openclaw.plugin.json`, `config.ts`, `index.ts`)
- `scripts/seed-hybrid.mjs`: example seed script for importing existing memories
- `scripts/export-hybrid-to-openclaw-memory.mjs`: migration exporter for native OpenClaw memory
- `docs/`: implementation and operations guides for pre-existing installs
- `docs/snippets/`: copy/paste snippet for `openclaw.json`

## Important Assumptions

- You already have OpenClaw running via Docker Compose.
- You can edit the existing compose project and restart services.
- You have an Ollama runtime reachable from the OpenClaw gateway runtime.
- You have pulled the local embedding model, for example `ollama pull nomic-embed-text:latest`.
- Your compose already mounts `${OPENCLAW_CONFIG_DIR}` to `/home/node/.openclaw` for gateway and CLI services.
- Linux container path for plugin extensions is:
  - `/home/node/.openclaw/extensions/memory-hybrid`

## Source Basis

OpenClaw official docs:

- `https://docs.openclaw.ai/plugins`
- `https://docs.openclaw.ai/plugins/configuration`
- `https://docs.openclaw.ai/install/docker`

This implementation tracks the TLDR workflow from:

- `https://clawdboss.ai/posts/give-your-clawdbot-permanent-memory`
- Scraped content endpoint used for file extraction:
  - `https://clawdboss.ai/api/posts/give-your-clawdbot-permanent-memory`
