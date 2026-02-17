# 04 - Install Plugin Files

## Option A (Recommended): Use Files from This Repository

This repo already includes the plugin source under:
- `openclaw-data/memory-hybrid/`

Copy/sync those files to your real `${OPENCLAW_MEMORY_HYBRID_DIR}`:

```bash
mkdir -p "${OPENCLAW_MEMORY_HYBRID_DIR}"
rsync -av --delete openclaw-data/memory-hybrid/ "${OPENCLAW_MEMORY_HYBRID_DIR}/"
```

## Option B: Re-Extract from Scraped Article Source

```bash
curl -sL 'https://clawdboss.ai/api/posts/give-your-clawdbot-permanent-memory' > /tmp/clawdboss-post.json
jq -r '.post.content' /tmp/clawdboss-post.json > /tmp/clawdboss-content.md

mkdir -p "${OPENCLAW_MEMORY_HYBRID_DIR}"

awk 'BEGIN{s=0} /^File 1 .*package\.json:/{s=1;next} /^File 2 .*openclaw\.plugin\.json:/{s=0} s{print}' /tmp/clawdboss-content.md \
  | sed '/^$/d' > "${OPENCLAW_MEMORY_HYBRID_DIR}/package.json"

awk 'BEGIN{s=0} /^File 2 .*openclaw\.plugin\.json:/{s=1;next} /^File 3 .*config\.ts:/{s=0} s{print}' /tmp/clawdboss-content.md \
  | sed '/^$/d' > "${OPENCLAW_MEMORY_HYBRID_DIR}/openclaw.plugin.json"

awk 'BEGIN{sec=0;code=0} /^### config\.ts$/{sec=1;next} sec && /^```typescript$/{code=1;next} sec && code && /^```$/{exit} sec && code{print}' /tmp/clawdboss-content.md \
  > "${OPENCLAW_MEMORY_HYBRID_DIR}/config.ts"

awk 'BEGIN{sec=0;code=0} /^### index\.ts$/{sec=1;next} sec && /^```typescript$/{code=1;next} sec && code && /^```$/{exit} sec && code{print}' /tmp/clawdboss-content.md \
  > "${OPENCLAW_MEMORY_HYBRID_DIR}/index.ts"
```

## Sanity Checks

```bash
jq . "${OPENCLAW_MEMORY_HYBRID_DIR}/package.json" >/dev/null
jq . "${OPENCLAW_MEMORY_HYBRID_DIR}/openclaw.plugin.json" >/dev/null
[ -s "${OPENCLAW_MEMORY_HYBRID_DIR}/config.ts" ]
[ -s "${OPENCLAW_MEMORY_HYBRID_DIR}/index.ts" ]
```
