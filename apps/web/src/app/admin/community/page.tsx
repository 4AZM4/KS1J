"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate, type Tables } from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { Alert, Badge, Button, Card } from "@/components/ui";

type Report = Tables<"community_reports">;
type Target = { title: string; body: string | null; by: string | null; removable: boolean; removed: boolean };

const KIND_LABEL: Record<Report["target_kind"], string> = { post: "Post", opportunity: "Opportunity", profile: "Profile", group: "Group" };

/**
 * Community moderation. Members report; the committee decides. Removing hides the post or opportunity
 * from members but keeps it on record. Private messages are never visible here, by design.
 */
export default function CommunityModerationPage() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [targets, setTargets] = useState<Map<string, Target>>(new Map());
  const [recent, setRecent] = useState<(Tables<"community_posts"> & { by: string })[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = supabase();
    const { data, error } = await db.from("community_reports").select("*").order("created_at", { ascending: false });
    if (error) return setError(errorMessage(error));
    const list = data ?? [];
    setReports(list);

    const ids = (k: Report["target_kind"]) => [...new Set(list.filter((r) => r.target_kind === k).map((r) => r.target_id))];
    const [posts, opps, profiles, groups, latest] = await Promise.all([
      db.from("community_posts").select("*").in("id", ids("post")),
      db.from("community_opportunities").select("*").in("id", ids("opportunity")),
      db.from("community_profiles").select("member_id, display_name, headline, bio").in("member_id", ids("profile")),
      db.from("community_groups").select("*").in("id", ids("group")),
      db.from("community_posts").select("*").order("created_at", { ascending: false }).limit(15),
    ]);
    const authorIds = [...(posts.data ?? []).map((p) => p.author_id), ...(opps.data ?? []).map((o) => o.author_id), ...(latest.data ?? []).map((p) => p.author_id)];
    const { data: people } = await db.from("community_profiles").select("member_id, display_name").in("member_id", [...new Set(authorIds)]);
    const name = (id: string) => people?.find((p) => p.member_id === id)?.display_name ?? "Member";

    const map = new Map<string, Target>();
    for (const p of posts.data ?? []) map.set(p.id, { title: p.group_id ? "Group post" : "Feed post", body: p.body, by: name(p.author_id), removable: true, removed: p.removed });
    for (const o of opps.data ?? []) map.set(o.id, { title: o.title, body: o.body, by: name(o.author_id), removable: true, removed: o.status === "removed" });
    for (const p of profiles.data ?? []) map.set(p.member_id, { title: p.display_name, body: [p.headline, p.bio].filter(Boolean).join(" — ") || null, by: null, removable: false, removed: false });
    for (const g of groups.data ?? []) map.set(g.id, { title: g.name, body: g.description, by: null, removable: false, removed: false });
    setTargets(map);
    setRecent((latest.data ?? []).map((p) => ({ ...p, by: name(p.author_id) })));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function setRemoved(kind: "post" | "opportunity", id: string, removed: boolean) {
    const db = supabase();
    const { error } =
      kind === "post"
        ? await db.from("community_posts").update({ removed }).eq("id", id)
        : await db.from("community_opportunities").update({ status: removed ? "removed" : "open" }).eq("id", id);
    if (error) return setError(errorMessage(error));
    setError(null);
    setNotice(removed ? "Removed. Members no longer see it; it stays on record." : "Restored.");
    void load();
  }

  async function resolve(r: Report) {
    const { error } = await supabase().from("community_reports").update({ status: "resolved" }).eq("id", r.id);
    if (error) return setError(errorMessage(error));
    void load();
  }

  const shown = (reports ?? []).filter((r) => showAll || r.status === "open");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Community</h1>
        <p className="mt-1 text-muted">
          Members report posts, opportunities, profiles or groups; the committee decides. Removing hides content from members but keeps it on record. Private messages are never shown here.
        </p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="good">{notice}</Alert> : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Reports</h2>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Show reviewed reports too
          </label>
        </div>
        {reports !== null && shown.length === 0 ? <p className="text-muted">No open reports.</p> : null}
        <ul className="space-y-3">
          {shown.map((r) => {
            const t = targets.get(r.target_id);
            return (
              <li key={r.id}>
                <Card>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-semibold">
                      {KIND_LABEL[r.target_kind]}: {t?.title ?? "(no longer exists)"}
                    </p>
                    <div className="flex gap-2">
                      {t?.removed ? <Badge tone="bad">Removed</Badge> : null}
                      <Badge tone={r.status === "open" ? "warn" : "good"}>{r.status === "open" ? "Open" : "Reviewed"}</Badge>
                    </div>
                  </div>
                  {t?.body ? <p className="mt-2 whitespace-pre-wrap">{t.body}</p> : null}
                  <p className="mt-2 text-sm text-muted">
                    {t?.by ? `By ${t.by} · ` : ""}Reported {formatDate(r.created_at)} · Reason: {r.reason}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t?.removable && (r.target_kind === "post" || r.target_kind === "opportunity") ? (
                      t.removed ? (
                        <Button variant="secondary" onClick={() => setRemoved(r.target_kind as "post" | "opportunity", r.target_id, false)}>Restore</Button>
                      ) : (
                        <Button variant="danger" onClick={() => setRemoved(r.target_kind as "post" | "opportunity", r.target_id, true)}>Remove</Button>
                      )
                    ) : null}
                    {r.status === "open" ? (
                      <Button variant="secondary" onClick={() => resolve(r)}>
                        {t?.removable ? "Mark as reviewed" : "Reviewed (contact the member if needed)"}
                      </Button>
                    ) : null}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Latest posts</h2>
        <ul className="space-y-3">
          {recent.map((p) => (
            <li key={p.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="text-sm text-muted">
                    {p.by} · {formatDate(p.created_at)} · {p.group_id ? "Group" : "Feed"}
                  </p>
                  {p.removed ? <Badge tone="bad">Removed</Badge> : null}
                </div>
                <p className="mt-1 whitespace-pre-wrap">{p.body}</p>
                <div className="mt-3">
                  <Button variant="secondary" onClick={() => setRemoved("post", p.id, !p.removed)}>
                    {p.removed ? "Restore" : "Remove"}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
