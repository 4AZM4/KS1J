# Module: AI helpdesk

**Owner:** Person D · **Tables (to add in a migration):** `kb_documents`, `kb_chunks` (pgvector)

## What it does

Members ask about Jamaat services, forms, timings and procedures. Answers come only from documents the Jamaat has approved, with the source cited.

## Built

- **Texts:** `kb_documents` + `kb_chunks` (migration 1400). One trustee adds, a different trustee approves. Approved text can't be edited, only retired. Search is Postgres full-text (`search_help`): all words first, then sections matching at least half the meaningful words, with headings weighted. pgvector can replace this later without changing the apps.
- **Function:** `supabase/functions/helpdesk`, for signed-in members only.
  - Ruling questions are redirected to the Marja' or the Jamaat's alim.
  - No match gives "I don't know that yet".
  - With `ANTHROPIC_API_KEY` set as a Supabase secret, Claude answers only from the found texts and must cite them. An answer without a citation is replaced by "I don't know".
  - Without the key, it shows the approved passages.
- **Log:** `helpdesk_questions` records the outcome with no member id. Gaps show on `/admin/helpdesk`.
- **Demo texts:** `supabase/kb_demo.sql` describes how the app works. Replace these with Jamaat-approved documents before launch.

## Rules

- Retrieve relevant chunks first; answer only from them; cite document title and page.
- No match → "I don't know that yet. Please contact the Jamaat office." Never guess.
- Fiqh questions (Khums rules, rulings) → point to the member's Marja' or the Jamaat's alim.
- Only publish texts the Jamaat owns or has permission to use.
- Runs server-side (Supabase Edge Function or Next.js route). The API key is never in the app.

## Pipeline

1. Upload approved PDFs to storage.
2. Chunk (~800 tokens, with overlap), embed, store in `kb_chunks`.
3. Query: embed question → top 5 chunks → Claude answers with citations.
4. Demo mode: cached answers for the 5 demo questions.

## Acceptance tests

- [ ] "How do I book the hall for a majlis?" returns an answer citing the right document.
- [ ] A question not in the documents gets the "I don't know" reply.
- [ ] A fiqh question is redirected to the Marja' or alim.
- [ ] Works from the app Learn tab and the website.
