# 06 - Dependency Install (Inside Existing Docker Setup)

## Start/Restart Services

```bash
docker compose up -d
```

## Toolchain Preflight (for `better-sqlite3`)

```bash
docker compose run --rm openclaw-gateway sh -lc 'python3 --version && make --version && (g++ --version || clang++ --version)'
```

If this fails, your image lacks build tools. Extend your base image to add build deps, then retry.

## Install Plugin Dependencies

```bash
docker compose run --rm openclaw-gateway sh -lc 'cd /home/node/.openclaw/extensions/memory-hybrid && npm install'
```

`better-sqlite3` is a Node package dependency of the plugin, so it should be installed in the plugin directory (not as an apt package and not in `/home/node/.openclaw` root).
Because plugin files are stored under `${OPENCLAW_CONFIG_DIR}/extensions/memory-hybrid` on host and exposed at `/home/node/.openclaw/extensions/memory-hybrid` in container, install through that path so it persists across container recreation.

## Version Check

```bash
docker compose run --rm openclaw-gateway sh -lc 'cd /home/node/.openclaw/extensions/memory-hybrid && npm ls @sinclair/typebox better-sqlite3 @lancedb/lancedb openai'
```

## Optional: Persistent Image Build

If you build a custom OpenClaw image, keep build prerequisites in apt and keep plugin dependencies in npm:

```dockerfile
ARG OPENCLAW_DOCKER_APT_PACKAGES="python3 make g++ libsqlite3-dev"
RUN apt-get update && apt-get install -y --no-install-recommends ${OPENCLAW_DOCKER_APT_PACKAGES} \
  && rm -rf /var/lib/apt/lists/*
```

Note: if your compose bind-mounts `${OPENCLAW_CONFIG_DIR}:/home/node/.openclaw`, image-layer files under `/home/node/.openclaw/extensions` are hidden at runtime by the mount.

Next:

- Run validation in `docs/07-validation-and-persistence.md`
- Run one-time seeding in `docs/09-seed-from-memory.md`
