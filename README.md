# KS1J

One app and website for the Jamaat: member services, welfare cases, scholarships, interest-free education loans, Khums, Lawajam and a verified-source helpdesk.

- **Member app** (iOS and Android): `apps/mobile`, Expo, 4 tabs: Home, Services, Give, Learn
- **Website and admin dashboard**: `apps/web`, Next.js
- **Backend**: Supabase (Postgres, Auth, Storage). Every money and approval rule is enforced in the database.

Plan: https://claude.ai/code/artifact/74bfdf5d-3cad-411c-9d79-b12f3409887d · Rules for contributors and Claude Code: [`CLAUDE.md`](CLAUDE.md)

## Getting started

Requires Node 20+ and pnpm 10.

```bash
pnpm install
cp .env.example apps/web/.env.local       # fill in Supabase URL and anon key
cp .env.example apps/mobile/.env.local
pnpm dev:web                              # http://localhost:3000 and /admin
pnpm dev:mobile                           # scan the QR code with Expo Go
```

## Database

```bash
supabase init                              # once, creates supabase/config.toml
supabase start                             # local stack
supabase db reset                          # applies migrations + seed.sql
psql "$DATABASE_URL" -f supabase/tests/rules.sql   # 130 rule tests
```

Demo day: run `supabase/demo_reset.sql`, then `supabase/seed_data.sql`, then `supabase/kb_demo.sql` to put the demo back to a clean start
(refuses unless demo mode is on). The walkthrough is in [`docs/demo-script.md`](docs/demo-script.md).

Migrations are owned by the backend lead. Add a new timestamped file; never edit one that is merged.

## Team workflow

1. Pick your module's GitHub issue. Spec: `docs/modules/<module>.md`. Prompt: `docs/prompts.md`.
2. Branch `feat/<module>`, run Claude Code in plan mode, review the plan, build.
3. Test every acceptance item on a real phone, open a PR, CI must pass.

## Checks

```bash
pnpm --filter @ks1j/shared test
pnpm typecheck
pnpm --filter web build
```
