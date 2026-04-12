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
          "provider": "ollama",
          "model": "nomic-embed-text",
          "baseUrl": "http://host.docker.internal:11434/v1",
          "dimensions": 768
        },
        "autoCapture": true,
        "autoRecall": true
      }
    }
  }
}
```

`plugins.installs.memory-hybrid` is what pins install provenance for doctor/status. Keep the paths container-visible because OpenClaw evaluates them inside the gateway container.

Keep the plugin-local `openclaw` dependency in `extensions/memory-hybrid/package.json` aligned with the host OpenClaw release family after upgrades. That compatibility check is separate from the `plugins.installs.memory-hybrid.version` provenance field shown above.

Reference snippet:

- `docs/snippets/openclaw-json-memory-hybrid.json`

## Local Embeddings

No OpenAI API key is required for embeddings in this configuration.

Run Ollama with the selected embedding model available:

```bash
ollama pull nomic-embed-text:latest
curl -fsS http://localhost:11434/api/tags
```

Set `embedding.baseUrl` to the URL reachable from the OpenClaw gateway runtime. For Docker Desktop on macOS, `http://host.docker.internal:11434/v1` usually reaches Ollama on the host. For a host install or same-network runtime, use `http://localhost:11434/v1`.

If you change the model or dimensions, rebuild LanceDB vectors before using semantic recall. Do not mix old 1536-dimensional OpenAI vectors with local 768-dimensional `nomic-embed-text` vectors.

## CLI Note

This repo's supported CLI is `hybrid-mem`. The bundled `openclaw memory ...` commands belong to the separate `memory-core` plugin and will not exist unless you explicitly allowlist/load that plugin too.
