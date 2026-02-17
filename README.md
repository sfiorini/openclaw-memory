# OpenClaw Memory-Hybrid (Existing Docker Installation)

This repository is documentation-first.

Use it to add the `memory-hybrid` plugin to an already running OpenClaw Docker setup, with persistence across container restart/recreate.

## Start Here

1. Read `docs/01-overview-and-scope.md`
2. Run the preflight in `docs/02-prerequisites-and-backup.md`
3. Apply compose updates from `docs/03-compose-changes.md`
4. Install plugin files using `docs/04-plugin-files.md`
5. Configure OpenClaw in `docs/05-openclaw-config.md`
6. Install dependencies in `docs/06-dependency-install.md`
7. Validate and persistence-test with `docs/07-validation-and-persistence.md`
8. Use `docs/08-troubleshooting.md` if anything fails

## What This Repo Provides

- `openclaw-data/memory-hybrid/`: plugin source files (`package.json`, `openclaw.plugin.json`, `config.ts`, `index.ts`)
- `docs/`: implementation and operations guides for pre-existing installs
- `docs/snippets/`: copy/paste snippets for compose and `openclaw.json`

## Important Assumptions

- You already have OpenClaw running via Docker Compose.
- You can edit the existing compose project and restart services.
- You have an OpenAI API key for embeddings.
- Linux container path for plugin extensions is:
  - `/usr/lib/node_modules/openclaw/extensions/memory-hybrid`

## Source Basis

This implementation tracks the TLDR workflow from:
- `https://clawdboss.ai/posts/give-your-clawdbot-permanent-memory`
- Scraped content endpoint used for file extraction:
  - `https://clawdboss.ai/api/posts/give-your-clawdbot-permanent-memory`
