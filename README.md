# OpenClaw Memory-Hybrid (Existing Docker Installation)

This repository is documentation-first.

Use it to add the `memory-hybrid` plugin to an already running OpenClaw Docker setup, with persistence across container restart/recreate.

This repo now reflects the normalized OpenClaw 2026.4.9+ path:
- `memory-hybrid` registers its own typed memory runtime
- auto-recall uses `before_prompt_build`, not legacy `before_agent_start`
- the plugin should be recorded under `plugins.installs` so `openclaw doctor` treats it as tracked installed code
- `hybrid-mem` is the supported CLI for this repo's workflow unless you separately allowlist the bundled `memory-core` plugin
- the plugin-local `openclaw` dependency should stay aligned with the host OpenClaw release family
- `openclaw.plugin.json` should allow empty config during metadata-only plugin introspection; runtime enforcement still happens in `index.ts`

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
10. Use `docs/08-troubleshooting.md` if anything fails

## Reference

- `docs/11-cli-reference.md` — Hybrid memory CLI commands

## What This Repo Provides

- `openclaw-data/memory-hybrid/`: plugin source files (`package.json`, `openclaw.plugin.json`, `config.ts`, `index.ts`)
- `scripts/seed-hybrid.mjs`: example seed script for importing existing memories
- `docs/`: implementation and operations guides for pre-existing installs
- `docs/snippets/`: copy/paste snippet for `openclaw.json`

## Important Assumptions

- You already have OpenClaw running via Docker Compose.
- You can edit the existing compose project and restart services.
- You have an OpenAI API key for embeddings.
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
