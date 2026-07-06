# Mogji

Mogji Circles is a mobile-first web game where one friend sets an emoji decode, the circle solves it, and the reveal shows who read them best.

## What is built

- pnpm/turbo monorepo shape from the locked spec
- `apps/web` Next App Router shell for create/join/home/solve/reveal/composer
- `packages/core` pure TypeScript scoring, XP, reveal computation, status transitions, puzzle validation, and forbidden-key stripping
- `packages/tokens` typed design tokens
- Supabase migration for `circles`, `members`, `decodes`, `answers`, `events`, RLS, status checks, and the one-live partial index
- Dev file-backed data adapter so the loop can run before Supabase credentials are connected

## Environment

Copy `.env.example` to `.env.local` in `apps/web` or the repo root and fill:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://zvfulyczcsxxkiyfvkyw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANON_TOKEN_SECRET=
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
CRON_SECRET=
USE_DEV_FILE_DB=true
```

The current implementation runs against the dev file DB. To wire the real Supabase project end to end, apply `supabase/migrations/202607060001_mogji_circles.sql` to project `zvfulyczcsxxkiyfvkyw`, then provide the anon and service-role keys.

## Run

```bash
pnpm install
pnpm dev
```

Then open `http://localhost:3000/new`.

## Verification

The current build has been verified with:

```bash
supabase db push --linked
supabase migration list --linked
pnpm --filter @mogji/core test
pnpm typecheck
pnpm build
```

The local dev server runs at `http://127.0.0.1:3000`.
