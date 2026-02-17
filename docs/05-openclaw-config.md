# 05 - Configure OpenClaw

Edit your existing OpenClaw config file:
- `${OPENCLAW_CONFIG_DIR}/openclaw.json`

## Required Changes

1. Set memory slot:

```json
"plugins": {
  "slots": {
    "memory": "memory-hybrid"
  }
}
```

2. Add plugin entry:

```json
"memory-hybrid": {
  "enabled": true,
  "config": {
    "embedding": {
      "apiKey": "${OPENAI_API_KEY}",
      "model": "text-embedding-3-small"
    },
    "autoCapture": true,
    "autoRecall": true
  }
}
```

Reference snippet:
- `docs/snippets/openclaw-json-memory-hybrid.json`

## API Key

Set `OPENAI_API_KEY` in your compose env source (for example `.env`).
Do not commit the real key.
