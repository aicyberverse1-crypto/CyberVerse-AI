---
name: Badge types
description: How to use BadgeKey type safely across the app
---

## Rules

- `BADGE_DEFS` in BadgeDisplay.tsx is declared `as const` and exported.
- `BadgeKey = keyof typeof BADGE_DEFS` is also exported.
- `user.badges` from the API is typed as `string[]` — cast as `BadgeKey[]` at every usage site.
- `badges.includes(badgeId)` requires casting `badgeId as BadgeKey` when iterating ALL_BADGES entries.

**Why:** `as const` makes BADGE_DEFS keys a narrow union. The API returns plain strings. Casting at usage sites avoids widening the component's prop type.
