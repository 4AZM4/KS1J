"use client";

import { useEffect, useState } from "react";
import { formatDate, type Tables } from "@ks1j/shared";
import { supabase } from "@/lib/supabase";

type Row = Pick<Tables<"announcements">, "id" | "title" | "body" | "published_at">;

/** Published announcements are public (RLS lets anyone read them). */
export function Announcements() {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    supabase()
      .from("announcements")
      .select("id, title, body, published_at")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setRows(data ?? []));
  }, []);

  if (rows === null) return <p className="text-muted">Loading announcements…</p>;
  if (rows.length === 0) return <p className="text-muted">No announcements right now.</p>;

  return (
    <ul className="divide-y divide-border border-y border-border">
      {rows.map((a) => (
        <li key={a.id} className="grid gap-1 py-5 sm:grid-cols-[10rem_1fr] sm:gap-6">
          <time className="text-sm text-muted" dateTime={a.published_at ?? undefined}>
            {formatDate(a.published_at)}
          </time>
          <div>
            <h3 className="text-lg font-bold text-ink">{a.title}</h3>
            <p className="mt-1 max-w-[65ch] text-base leading-relaxed text-muted">{a.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
