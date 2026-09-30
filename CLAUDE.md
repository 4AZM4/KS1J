# KS1J

One app and website for the Jamaat: member identity, welfare cases, scholarships, education loans,
Khums, Lawajam and a verified-source helpdesk. Built for a 10-hour hackathon, most setup done beforehand.

Full plan (source of truth for scope): https://claude.ai/code/artifact/74bfdf5d-3cad-411c-9d79-b12f3409887d

## Repo map

| Path | What |
| --- | --- |
| `apps/mobile` | Expo Router member app (iOS, Android). Exactly 4 tabs: Home, Services, Give, Learn |
| `apps/web` | Next.js: public site at `/`, admin dashboard at `/admin` |
| `packages/shared` | Domain rules, Khums and loan maths, Supabase client. Used by both apps |
| `supabase/migrations` | Schema, triggers, RLS. The database enforces every money rule |
| `supabase/seed.sql` | Fictional demo data |
| `supabase/tests/rules.sql` | Behaviour tests for approval and fund rules |
| `docs/modules/*.md` | One spec per module, with acceptance tests |
| `docs/prompts.md` | Ready-to-paste prompts per module |

Each app has its own `AGENTS.md` from its framework. Read it before touching that app: Next.js 16 and
Expo SDK 57 differ from older versions.

## Commands

```bash
pnpm install
pnpm dev:web                       # http://localhost:3000
pnpm dev:mobile                    # Expo; scan QR with Expo Go
pnpm --filter @ks1j/shared test    # domain rule tests
pnpm typecheck && pnpm build       # before every PR
```
Add mobile packages with `pnpm --filter mobile exec expo install <pkg>`, never plain `pnpm add`.

## Hard rules (never break these)

1. **Two different admins per case.** A verifier verifies, a different trustee approves. The trigger
   `enforce_case_transition` enforces this; never bypass it from app code.
2. **Fund separation.**
   - Sehme Sadaat goes only to verified Sadaat (Syed) cases.
   - Sehme Imam goes only to institutions holding a verified ijazah from a Marja'. Never to individuals or cases.
   - General donations go to any published case.
   Rules live in `check_donation_rules` (SQL) and `isDonationAllowed` (shared). Change both together.
3. **Money never moves on the client.** Apps create `pending` donations or repayments. Only the
   server, after the payment gateway confirms, sets `paid`. The service-role key never goes in
   `apps/mobile` or any client component.
4. **Ledgers are append-only.** Corrections are new reversing rows.
5. **Privacy.** Public case cards come only from `list_public_cases()` (no names, phones, addresses).
   Beneficiary details are visible only to the applicant and staff.
6. **RLS on every table.** New tables ship with RLS enabled and policies in the same migration.
7. **AI only flags and suggests.** It never approves, rejects, pays or gives religious rulings.
   Helpdesk answers cite a Jamaat-approved source or say it does not know.
8. **Religious guidance.** Khums screens always show "Confirm with your Marja' or the Jamaat's alim".
   Loans have no interest and no late fees.
9. **Elder-friendly UI.** Body text at least 16, tappable cards, plain words, 4 tabs only.

## Conventions

- TypeScript strict everywhere. Amounts are integer rupees.
- Schema changes: new file in `supabase/migrations/` named `YYYYMMDDHHMMSS_what.sql`. Only the
  backend owner merges migrations. Keep `packages/shared/src/domain.ts` enums in sync.
- Specs first: read `docs/modules/<module>.md`, plan, then build. A module is done when every
  acceptance test in its spec passes on a real phone.
- Branch per module (`feat/<module>`), PR to `main`, CI must be green.
