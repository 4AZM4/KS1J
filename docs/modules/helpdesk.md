# Module: AI helpdesk

**Owner:** Person D · **Tables (to add in a migration):** `kb_documents`, `kb_chunks` (pgvector)

## What it does

Members ask about Jamaat services, forms, timings and procedures. Answers come only from documents the Jamaat has approved, with the source cited.

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
