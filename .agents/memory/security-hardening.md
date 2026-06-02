---
name: Security & production hardening
description: Required settings in artifacts/api-server/src/app.ts for prod-ready Express
---

## Rules

1. `app.set("trust proxy", 1)` must come BEFORE rate limiters — without it, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR every request through Replit's proxy.
2. `helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false })` — CSP false because Vite/React sets its own; COEP false because Replit uses iframes.
3. CORS: use `ALLOWED_ORIGINS` env var (comma-separated) in prod; falls back to `true` (allow all) in dev.
4. Body limit: `express.json({ limit: "1mb" })` to prevent payload attacks.
5. Global error handler at bottom of app.ts catches unhandled route errors.

**Why:** Replit's reverse proxy injects X-Forwarded-For; without trust proxy the rate limiter uses the proxy IP and either blocks everyone or never rate-limits anyone.
