import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ─── Trust Proxy ──────────────────────────────────────────────────────────────
// Required for express-rate-limit to read X-Forwarded-For from Replit proxy
app.set("trust proxy", 1);

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // disabled — Vite/React sets its own CSP
    crossOriginEmbedderPolicy: false, // needed for iframe previews
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : null;

app.use(
  cors({
    origin: allowedOrigins
      ? (origin, cb) => {
          // allow server-to-server (no origin) and listed origins
          if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
            cb(null, true);
          } else {
            cb(new Error(`CORS: origin '${origin}' not allowed`));
          }
        }
      : true, // dev: allow all
    credentials: true,
  }),
);

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait before trying again." },
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI rate limit reached. Please wait a moment." },
});

const scoreLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many score submissions. Slow down." },
});

app.use("/api/auth", authLimiter);
app.use("/api/ai", aiLimiter);
app.use("/api/score", scoreLimiter);
app.use("/api/multiplayer", scoreLimiter);

// ─── Request Logging ──────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── Unmatched /api/* → JSON 404 ──────────────────────────────────────────────
app.use("/api", (_req: express.Request, res: express.Response) => {
  res.status(404).json({ error: "Not found" });
});

// ─── Static Frontend (production only) ───────────────────────────────────────
// Serves the Vite-built React app and falls back to index.html for SPA routing
if (process.env.NODE_ENV === "production") {
  const staticDir = path.resolve(
    process.cwd(),
    process.env.STATIC_DIR ?? "artifacts/cyberverse/dist/public",
  );
  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir, { maxAge: "1h", etag: true }));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticDir, "index.html"));
    });
  } else {
    logger.warn({ staticDir }, "Static dir not found — frontend will not be served");
  }
}

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ err }, message);
  res.status(500).json({ error: message });
});

export default app;
