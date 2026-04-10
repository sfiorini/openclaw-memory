# 04 - Install Plugin Files

## Option A (Recommended): Use Files from This Repository

This repo already includes the plugin source under:

- `openclaw-data/memory-hybrid/`

Copy/sync those files to:

- `${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid`

```bash
mkdir -p "${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid"
rsync -av --delete openclaw-data/memory-hybrid/ "${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid/"
```

This host directory is mounted into the container at:

- `/home/node/.openclaw/extensions/memory-hybrid`

If you re-run `rsync --delete`, plugin `node_modules` in that folder are removed and you must re-run dependency install from `docs/06-dependency-install.md`.

## Provenance Note

On OpenClaw 2026.4.9+, copying files into `extensions/memory-hybrid/` is not enough if you want a clean `openclaw doctor` result. The plugin should also be represented under `plugins.installs` in `openclaw.json` so OpenClaw treats it as tracked installed code rather than an untracked local drop-in.

The plugin metadata should stay permissive enough for metadata-only introspection with empty config. Runtime config enforcement still belongs in `index.ts`.

Use the same runtime-visible path for both `sourcePath` and `installPath` when this repo is the deployed source:

- `/home/node/.openclaw/extensions/memory-hybrid`

## Option B: Re-Extract from Scraped Article Source

```bash
curl -sL 'https://clawdboss.ai/api/posts/give-your-clawdbot-permanent-memory' > /tmp/clawdboss-post.json
jq -r '.post.content' /tmp/clawdboss-post.json > /tmp/clawdboss-content.md

mkdir -p "${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid"

awk 'BEGIN{s=0} /^File 1 .*package\.json:/{s=1;next} /^File 2 .*openclaw\.plugin\.json:/{s=0} s{print}' /tmp/clawdboss-content.md \
  | sed '/^$/d' > "${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid/package.json"

awk 'BEGIN{s=0} /^File 2 .*openclaw\.plugin\.json:/{s=1;next} /^File 3 .*config\.ts:/{s=0} s{print}' /tmp/clawdboss-content.md \
  | sed '/^$/d' > "${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid/openclaw.plugin.json"

awk 'BEGIN{sec=0;code=0} /^### config\.ts$/{sec=1;next} sec && /^```typescript$/{code=1;next} sec && code && /^```$/{exit} sec && code{print}' /tmp/clawdboss-content.md \
  > "${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid/config.ts"

awk 'BEGIN{sec=0;code=0} /^### index\.ts$/{sec=1;next} sec && /^```typescript$/{code=1;next} sec && code && /^```$/{exit} sec && code{print}' /tmp/clawdboss-content.md \
  > "${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid/index.ts"
```

## Sanity Checks

```bash
jq . "${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid/package.json" >/dev/null
jq . "${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid/openclaw.plugin.json" >/dev/null
[ -s "${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid/config.ts" ]
[ -s "${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid/index.ts" ]
```
