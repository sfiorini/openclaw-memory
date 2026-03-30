# 05 - Configure OpenClaw

Edit your existing OpenClaw config file:

- `${OPENCLAW_CONFIG_DIR}/openclaw.json`

## Required Changes

1. Set memory slot and plugin entry under `plugins`:

```json
"plugins": {
  "installs": {
    "memory-hybrid": {
      "source": "path",
      "sourcePath": "/home/node/.openclaw/extensions/memory-hybrid",
      "installPath": "/home/node/.openclaw/extensions/memory-hybrid",
      "version": "2026.1.24"
    }
  },
  "slots": {
    "memory": "memory-hybrid"
  },
  "entries": {
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
  }
}
```

`plugins.installs.memory-hybrid` is what pins install provenance for doctor/status. Keep the paths container-visible because OpenClaw evaluates them inside the gateway container.

Reference snippet:

- `docs/snippets/openclaw-json-memory-hybrid.json`

## API Key

Set `OPENAI_API_KEY` in your compose env source (for example `.env`).
Do not commit the real key.

## CLI Note

This repo's supported CLI is `hybrid-mem`. The bundled `openclaw memory ...` commands belong to the separate `memory-core` plugin and will not exist unless you explicitly allowlist/load that plugin too.
