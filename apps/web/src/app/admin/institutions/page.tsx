"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate, type Tables, uploadProblem } from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth";
import { Alert, Badge, Button, Card, inputClass } from "@/components/ui";

type Institution = Tables<"institutions"> & {
  adder: { full_name: string } | null;
  verifier: { full_name: string } | null;
};

/** Sehme Imam may go only to these institutions, once a second trustee verifies the ijazah. */
export default function InstitutionsPage() {
  const { session, hasRole } = useAuth();
  const isTrustee = hasRole("trustee");
  const me = session?.user.id;
  const [rows, setRows] = useState<Institution[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase()
      .from("institutions")
      .select(
        "*, adder:members!institutions_added_by_fkey(full_name), verifier:members!institutions_ijazah_verified_by_fkey(full_name)",
      )
      .order("created_at", { ascending: false });
    if (error) setError(errorMessage(error));
    setRows((data ?? []) as unknown as Institution[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const done = (msg: string) => {
    setNotice(msg);
    setError(null);
    void load();
  };
  const fail = (e: unknown) => {
    setError(errorMessage(e));
    setNotice(null);
  };

  async function openDoc(path: string) {
    const { data, error } = await supabase().storage.from("documents").createSignedUrl(path, 300);
    if (error) return fail(new Error("This ijazah document is not in storage (demo data)."));
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function update(id: string, values: Partial<Tables<"institutions">>, msg: string) {
    // The database stamps who verified and when; the value sent here only signals "verify".
    const { error } = await supabase().from("institutions").update(values).eq("id", id);
    if (error) return fail(error);
    done(msg);
  }

  const pending = (rows ?? []).filter((r) => !r.ijazah_verified_by);
  const verified = (rows ?? []).filter((r) => r.ijazah_verified_by);

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Sehme Imam institutions</h1>
        <p className="mt-1 text-muted">
          Sehme Imam goes only to institutions holding an ijazah from a Marja&apos;. One trustee adds, a different trustee verifies.
        </p>
      </div>
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="good">{notice}</Alert> : null}

      {isTrustee ? <AddInstitution onDone={done} onError={fail} /> : null}

      <section>
        <h2 className="text-lg font-semibold">Waiting for ijazah verification</h2>
        <p className="mb-3 text-sm text-muted">Hidden from members until verified.</p>
        <div className="space-y-3">
          {pending.length === 0 ? <p className="text-muted">Nothing waiting.</p> : null}
          {pending.map((r) => (
            <Card key={r.id}>
              <p className="font-semibold">{r.name}</p>
              <p className="text-sm text-muted">
                {[r.city, `Ijazah from ${r.marja}`, r.adder ? `added by ${r.adder.full_name}` : null].filter(Boolean).join(" · ")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => openDoc(r.ijazah_document_path)}>
                  View ijazah
                </Button>
                {isTrustee ? (
                  <Button
                    disabled={r.added_by === me}
                    title={r.added_by === me ? "A different trustee must verify" : undefined}
                    onClick={() => update(r.id, { ijazah_verified_by: me }, `${r.name} verified. Members can now pay Sehme Imam to it.`)}
                  >
                    {r.added_by === me ? "Another trustee must verify" : "I checked the ijazah: verify"}
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Verified</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 pr-3">Institution</th>
                <th className="py-2 pr-3">Marja&apos;</th>
                <th className="py-2 pr-3">Verified by</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {verified.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2 pr-3 font-medium">
                    {r.name}
                    {r.city ? <span className="block text-xs text-muted">{r.city}</span> : null}
                  </td>
                  <td className="py-2 pr-3">{r.marja}</td>
                  <td className="py-2 pr-3">
                    {r.verifier?.full_name ?? "—"}
                    <span className="block text-xs text-muted">{formatDate(r.ijazah_verified_at)}</span>
                  </td>
                  <td className="py-2 pr-3">
                    <Badge tone={r.is_active ? "good" : "neutral"}>{r.is_active ? "Receiving" : "Paused"}</Badge>
                  </td>
                  <td className="py-2 text-right">
                    {isTrustee ? (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          update(r.id, { is_active: !r.is_active }, r.is_active ? `${r.name} paused.` : `${r.name} receiving again.`)
                        }
                      >
                        {r.is_active ? "Pause" : "Resume"}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AddInstitution({ onDone, onError }: { onDone: (m: string) => void; onError: (e: unknown) => void }) {
  const { session } = useAuth();
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [marja, setMarja] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = name.trim() && marja.trim() && file;

  async function add() {
    if (!session || !file) return;
    const problem = uploadProblem(file.size, file.type, file.name);
    if (problem) return onError(new Error(problem));
    setBusy(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
      const path = `${session.user.id}/ijazah-${Date.now()}.${ext}`;
      const up = await supabase().storage.from("documents").upload(path, file, { contentType: file.type || "application/pdf" });
      if (up.error) throw up.error;
      const { error } = await supabase()
        .from("institutions")
        .insert({ name: name.trim(), city: city.trim() || null, marja: marja.trim(), ijazah_document_path: path });
      if (error) throw error;
      setName("");
      setCity("");
      setMarja("");
      setFile(null);
      onDone("Institution added. A different trustee now needs to verify the ijazah.");
    } catch (e) {
      onError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <h2 className="font-semibold">Add an institution</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Name</span>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">City</span>
          <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Marja&apos; who granted the ijazah</span>
          <input className={inputClass} value={marja} onChange={(e) => setMarja(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Ijazah document (PDF or photo)</span>
          <input
            className={inputClass}
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <Button className="mt-3" disabled={busy || !ready} onClick={add}>
        Add institution
      </Button>
    </Card>
  );
}
