"use client";

import { useCallback, useEffect, useState } from "react";
import { DOCUMENT_KINDS, DOCUMENT_KIND_LABEL, formatDate, type DocumentKind, type Tables } from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth";
import { Button, Card, inputClass } from "@/components/ui";

type Doc = Tables<"case_documents"> & { uploader: { full_name: string } | null };

/**
 * Documents attached to a case. Files live in the private `documents` bucket; the link to
 * open one is signed and expires after five minutes. Staff can add a document brought to the office.
 */
export function CaseDocuments({ caseId, suggested }: { caseId: string; suggested: DocumentKind[] }) {
  const { session } = useAuth();
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [kind, setKind] = useState<DocumentKind>(suggested[0] ?? "other");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase()
      .from("case_documents")
      .select("*, uploader:members!case_documents_uploaded_by_fkey(full_name)")
      .eq("case_id", caseId)
      .order("created_at");
    if (error) setError(errorMessage(error));
    setDocs((data ?? []) as unknown as Doc[]);
  }, [caseId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function open(d: Doc) {
    const { data, error } = await supabase().storage.from("documents").createSignedUrl(d.storage_path, 300);
    if (error) return setError("This file could not be opened. It may not have finished uploading.");
    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function add() {
    if (!session || !file) return;
    setBusy(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
      const path = `${session.user.id}/case-${caseId.slice(0, 8)}-${kind}-${Date.now()}.${ext}`;
      const up = await supabase().storage.from("documents").upload(path, file, { contentType: file.type || "application/pdf" });
      if (up.error) throw up.error;
      const { error } = await supabase()
        .from("case_documents")
        .insert({ case_id: caseId, kind, storage_path: path, uploaded_by: session.user.id });
      if (error) throw error;
      setFile(null);
      void load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const have = new Set((docs ?? []).map((d) => d.kind));
  const missing = suggested.filter((k) => !have.has(k));

  return (
    <Card className="mt-4">
      <h2 className="font-semibold">Documents</h2>
      {error ? <p className="mt-2 text-sm text-red-700 dark:text-red-400">{error}</p> : null}
      {docs !== null && missing.length > 0 ? (
        <p className="mt-1 text-sm text-muted">
          Not yet provided: {missing.map((k) => DOCUMENT_KIND_LABEL[k].toLowerCase()).join(", ")}.
        </p>
      ) : null}
      {docs?.length === 0 ? <p className="mt-3 text-muted">No documents attached yet.</p> : null}
      <ul className="mt-3 divide-y divide-border">
        {(docs ?? []).map((d) => (
          <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <span>
              <span className="font-semibold">{DOCUMENT_KIND_LABEL[d.kind as DocumentKind] ?? d.kind}</span>
              <span className="text-muted">
                {" "}
                · {formatDate(d.created_at)}
                {d.uploader ? ` · from ${d.uploader.full_name}` : ""}
              </span>
            </span>
            <Button variant="secondary" onClick={() => open(d)}>
              Open
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Add a document brought to the office</span>
          <select className={`${inputClass} w-56`} value={kind} onChange={(e) => setKind(e.target.value as DocumentKind)}>
            {DOCUMENT_KINDS.map((k) => (
              <option key={k} value={k}>
                {DOCUMENT_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <input
          className={`${inputClass} w-64`}
          type="file"
          accept="application/pdf,image/*"
          aria-label="Document file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Button disabled={busy || !file} onClick={add}>
          {busy ? "Uploading…" : "Upload"}
        </Button>
      </div>
    </Card>
  );
}
