---
name: Scores table schema
description: What fields the scoresTable actually has — important for AI hint memory logic
---

## Schema (lib/db/src/schema/scores.ts)

Fields: id, userId, mode, score (integer), xpEarned, createdAt

**No isCorrect field.** Use `score > 0` as the correctness proxy when computing per-mode accuracy in AI hint routes.

**Why:** The DB schema never had isCorrect; using it causes a TS error and a runtime crash.
