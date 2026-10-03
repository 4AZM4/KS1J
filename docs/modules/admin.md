# Module: Admin dashboard and roles

**Owner:** Person B · **Where:** `apps/web/src/app/admin`

## Roles (`member_roles`)

| Role | Can | Cannot |
| --- | --- | --- |
| volunteer | Submit cases for others | Verify, approve, pay |
| verifier | Verify documents, need, Sadaat status (Aadhaar card); review fraud flags; verify members | Approve or pay |
| trustee | Approve/reject verified cases, publish, manage institutions and announcements | Approve a case they verified; pay |
| finance | Record disbursements, see ledgers, manage Lawajam | Change approvals |
| super_admin | Everything, including assigning roles | Approve a case they verified (still blocked) |

Access is enforced by RLS and triggers. Hiding a button is only for convenience.

## Pages

| Route | Content |
| --- | --- |
| `/admin` | Counts per case status, fund balances per ledger, overdue loans, open fraud flags |
| `/admin/cases` | See `cases.md` |
| `/admin/loans` | See `loans.md` |
| `/admin/khums` | Collections by share |
| `/admin/institutions` | Sehme Imam institutions and ijazah verification |
| `/admin/lawajam` | See `lawajam.md` |
| `/admin/flags` | See `ai-and-security.md` |
| `/admin/announcements` | Create and publish announcements |

## Acceptance tests

- [ ] A member without a role who opens `/admin` sees no data (RLS returns nothing).
- [ ] Each role sees only the actions it may take.
- [ ] Analytics show totals only, never beneficiary names.
- [ ] An announcement published here appears on the app Home tab and the website.
