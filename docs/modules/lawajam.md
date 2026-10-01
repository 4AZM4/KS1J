# Module: Lawajam (membership dues)

**Owner:** Person C · **Tables:** `lawajam_dues`, `lawajam_payments`

## What it does

Members see and pay their household's Lawajam in the Give tab and download receipts. Finance sees paid and outstanding by household and area.

## Open decisions (placeholders until the Jamaat confirms)

- Amount and period (seed uses ₹1,200 for `2026-27`).
- Per member or per household (schema is per household).

## Built

App: Give → Lawajam (`/lawajam`: due, pay, receipts). Payments only for your own household's pending due, for the full amount (RLS). Web: `/admin/lawajam` (raise a year's dues with `create_lawajam_period`, totals, by area, copy reminder list).

## Screens

**App, Give → Lawajam:** amount due, period, pay, receipts for past periods.
**Web, /admin/lawajam:** table by area and household; one-click reminder to all outstanding.

## Acceptance tests

- [ ] A member sees only their own household's dues.
- [ ] Payment stays pending until the gateway confirms, then the due shows Paid.
- [ ] Lawajam never appears in Khums or case ledgers.
