## What this changes

<!-- One or two lines. Link the module issue: Closes #__ -->

## Module spec

`docs/modules/____.md`

## Checklist

- [ ] Acceptance tests from the spec pass
- [ ] Tested on a real phone (for app changes)
- [ ] No keys or secrets committed; service-role key is server-only
- [ ] Money rules untouched, or `supabase/tests/rules.sql` updated and passing
- [ ] New tables have RLS enabled with policies in the same migration
- [ ] `pnpm typecheck` and `pnpm --filter web build` pass
