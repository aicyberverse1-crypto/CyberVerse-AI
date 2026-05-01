# CyberVerse AI: Hacker vs Defender Simulator

## Overview

Full-stack cybersecurity simulation platform. Players train through 4 game modes (Phishing Detective, Attack Defense, Secure Builder, Escape Room), earn XP/levels, chat with an AI cybersecurity mentor, and compete on a global leaderboard.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/cyberverse) — dark cyberpunk theme, Tailwind CSS, framer-motion
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Auth**: JWT (bcryptjs + jsonwebtoken), SESSION_SECRET env var
- **AI**: OpenAI via Replit AI integration (gpt-4o-mini), AI hint + AI chat routes
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- **Build**: esbuild (CJS bundle)

## Key Pages

- `/login` — JWT auth login
- `/register` — new operator registration
- `/dashboard` — XP/level stats, mode select, risk meter, recent activity
- `/phishing` — Phishing Detective quiz with AI hints
- `/defense` — Attack Defense (timed quiz)
- `/builder` — Secure Builder (password strength + 2FA simulator)
- `/escape` — Escape Room (timed cryptographic puzzles)
- `/ai-assistant` — Full AI chat with CyberGuard AI
- `/leaderboard` — global rankings with podium

## Key Files

- `artifacts/api-server/src/routes/` — all API routes
- `artifacts/cyberverse/src/pages/` — all frontend pages
- `artifacts/cyberverse/src/components/layout/AppLayout.tsx` — sidebar + navbar
- `artifacts/cyberverse/src/components/AiChatWidget.tsx` — floating AI chat
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/db/src/schema.ts` — PostgreSQL schema (users, questions, scores)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
