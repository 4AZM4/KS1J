"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate, type Tables } from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth";
import { Alert, Badge, Button, Card, inputClass } from "@/components/ui";

type Row = Tables<"announcements"> & { author: { full_name: string } | null };

/** Trustees post announcements. Published ones show on the app Home tab and the website. */
export default function AnnouncementsPage() {
  const { hasRole } = useAuth();
  const canPost = hasRole("trustee");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase()
      .from("announcements")
      .select("*, author:members!announcements_created_by_fkey(full_name)")
      .order("created_at", { ascending: false });
    if (error) setError(errorMessage(error));
    setRows((data ?? []) as unknown as Row[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function save(publish: boolean) {
    setBusy(true);
    const { error } = await supabase()
      .from("announcements")
      .insert({ title: title.trim(), body: body.trim(), published_at: publish ? new Date().toISOString() : null });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setTitle("");
    setBody("");
    setError(null);
    setNotice(publish ? "Published. Members see it on the app Home tab and the website." : "Saved as a draft.");
    void load();
  }

  async function setPublished(r: Row, publish: boolean) {
    const { error } = await supabase()
      .from("announcements")
      .update({ published_at: publish ? new Date().toISOString() : null })
      .eq("id", r.id);
    if (error) return setError(errorMessage(error));
    setNotice(publish ? `"${r.title}" published.` : `"${r.title}" taken down.`);
    void load();
  }

  const ready = title.trim().length >= 3 && body.trim().length >= 3;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Announcements</h1>
        <p className="mt-1 text-muted">Published announcements appear on the app Home tab and the website.</p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="good">{notice}</Alert> : null}

      {canPost ? (
        <Card>
          <h2 className="font-semibold">New announcement</h2>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-muted">Title</span>
            <input className={inputClass} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-muted">Message</span>
            <textarea className={`${inputClass} min-h-32`} value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={busy || !ready} onClick={() => save(true)}>
              Publish now
            </Button>
            <Button variant="secondary" disabled={busy || !ready} onClick={() => save(false)}>
              Save draft
            </Button>
          </div>
        </Card>
      ) : (
        <p className="text-muted">Trustees post announcements.</p>
      )}

      <ul className="space-y-3">
        {(rows ?? []).map((r) => (
          <li key={r.id}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-muted">
                    {r.published_at ? `Published ${formatDate(r.published_at)}` : `Draft from ${formatDate(r.created_at)}`}
                    {r.author ? `, by ${r.author.full_name}` : ""}
                  </p>
                </div>
                <Badge tone={r.published_at ? "good" : "neutral"}>{r.published_at ? "Published" : "Draft"}</Badge>
              </div>
              <p className="mt-2 whitespace-pre-line">{r.body}</p>
              {canPost ? (
                <Button className="mt-3" variant="secondary" onClick={() => setPublished(r, !r.published_at)}>
                  {r.published_at ? "Take down" : "Publish"}
                </Button>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
