# PantryPal Web

A full rebuild of [PantryPal](https://github.com/adrianwongg1/Pantry_Pal) (a JavaFX desktop app) as a hosted, AI-powered web app: tell it what's in your kitchen and it turns that into a cookable recipe — with dietary preferences, a saved pantry, and public share pages that actually work for anyone with the link.

**Status: early build-out (Phase 2 of 7).** The JavaFX version isn't touched by this — it stays where it is as the behavioral reference.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript, Tailwind v4
- **Supabase** — Postgres, auth, storage, Row Level Security
- **Vercel AI SDK** — [Groq](https://console.groq.com) (`llama-3.3-70b-versatile`, free tier) by default for recipe generation and transcription, [Anthropic Claude Haiku 4.5](https://console.anthropic.com) as the fallback tier
- Design tokens ported from a [Claude Design](https://claude.ai/design) system ("Organic" — warm cream/terracotta/sage, Caprasimo + Figtree), extended with PantryPal's own five-category meal-type color scale
- Vitest (unit) + Playwright (e2e), deployed on Vercel

## Local setup

```bash
pnpm install
cp .env.example .env.local   # fill in real values, see below
pnpm dev
```

Required in `.env.local`:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page (legacy anon key also works — `src/lib/env.ts` doesn't check format) |
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) — free, no credit card |
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) — only required once AI routes land (Phase 5) |

`SUPABASE_SECRET_KEY` is **not** needed to run the app — it's only for one-off admin scripts (e.g. a future Mongo migration script) and is deliberately kept out of the app's own required env schema (`src/lib/env.server.ts`).

## Database

All schema lives in `supabase/migrations/`, applied in order. Regenerate types after any schema change, against the local stack (`supabase start` first) — not `--project-id`, which produces structurally different output (no `graphql_public` block) and will never match what CI checks:

```bash
supabase db reset   # applies every migration fresh
supabase gen types typescript --local > src/lib/supabase/database.types.ts
```

CI (`.github/workflows/ci.yml`) does exactly this on each PR and fails if the committed types don't match — a migration can't silently drift from what's checked in.

## Testing

```bash
pnpm test        # Vitest, watch mode
pnpm test --run  # once, for CI
pnpm test:e2e    # Playwright, against a real `next build && next start` on port 3101
pnpm typecheck
pnpm lint
```

`pnpm test:e2e` builds and starts the app itself the first time; on a machine already running another Next.js project's dev server, port 3101 keeps this from silently attaching to the wrong app (see `playwright.config.ts`).

## Docs

The full PRD — product scope, architecture decisions, data model, RLS design, AI provider strategy, and the phased build order — lives in the planning doc this project was built from, not duplicated here to avoid drift. Ask in the repo if you need it re-shared.
