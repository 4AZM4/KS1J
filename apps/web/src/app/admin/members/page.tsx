"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate, type Tables } from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth";
import { Alert, Button, Card, inputClass } from "@/components/ui";

type Member = Tables<"members">;
type Household = Tables<"households"> & { members: { full_name: string }[] };

/** New signups: a verifier checks the person and links them to their household. */
export default function MembersPage() {
  const { hasRole } = useAuth();
  const canVerify = hasRole("verifier");
  const [pending, setPending] = useState<Member[] | null>(null);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = supabase();
    const [m, h] = await Promise.all([
      db.from("members").select("*").eq("membership_verified", false).order("created_at"),
      db.from("households").select("*, members(full_name)").order("area"),
    ]);
    if (m.error) setError(errorMessage(m.error));
    setPending(m.data ?? []);
    setHouseholds((h.data ?? []) as unknown as Household[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Members to verify</h1>
        <p className="mt-1 text-muted">
          People who signed up in the app or on the website. Check who they are, then link them to their household. Until
          then they cannot see any family dues or loans.
        </p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="good">{notice}</Alert> : null}
      {pending?.length === 0 ? <p className="text-muted">Nobody is waiting.</p> : null}
      <ul className="space-y-3">
        {(pending ?? []).map((m) => (
          <li key={m.id}>
            <VerifyCard
              m={m}
              households={households}
              canVerify={canVerify}
              onDone={(msg) => {
                setNotice(msg);
                setError(null);
                void load();
              }}
              onError={(e) => setError(errorMessage(e))}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function VerifyCard({
  m,
  households,
  canVerify,
  onDone,
  onError,
}: {
  m: Member;
  households: Household[];
  canVerify: boolean;
  onDone: (msg: string) => void;
  onError: (e: unknown) => void;
}) {
  const sameArea = households.filter((h) => m.area && h.area.toLowerCase() === m.area.toLowerCase());
  const [choice, setChoice] = useState<string>(sameArea[0]?.id ?? "new");
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    try {
      const db = supabase();
      let householdId = choice;
      if (choice === "new") {
        const { data, error } = await db
          .from("households")
          .insert({ area: m.area?.trim() || "Not given", address: m.address })
          .select("id")
          .single();
        if (error) throw error;
        householdId = data.id;
      }
      const { error } = await db.from("members").update({ household_id: householdId, membership_verified: true }).eq("id", m.id);
      if (error) throw error;
      onDone(`${m.full_name} is now a verified member.`);
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <p className="text-lg font-semibold">{m.full_name}</p>
      <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <Item label="Mobile" value={m.phone ?? "Not given (or already registered to someone else)"} />
        <Item label="Area" value={m.area ?? "—"} />
        <Item label="Address" value={m.address ?? "—"} />
        <Item label="Jamaat number" value={m.jamaat_number ?? "—"} />
        <Item label="Signed up" value={formatDate(m.created_at)} />
      </dl>
      {canVerify ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="mb-1 block text-muted">Household</span>
            <select className={`${inputClass} w-80`} value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="new">New household{m.area ? ` in ${m.area}` : ""}</option>
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.area}: {h.members.map((x) => x.full_name).join(", ") || h.address || "no members yet"}
                </option>
              ))}
            </select>
          </label>
          <Button disabled={busy} onClick={verify}>
            Verify member
          </Button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">A verifier confirms new members.</p>
      )}
    </Card>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="text-muted">{label}:</dt>
      <dd>{value}</dd>
    </div>
  );
}
