"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CHECKED_DOCUMENT_KINDS,
  DOCUMENT_KINDS,
  DOCUMENT_KIND_LABEL,
  formatDate,
  rupees,
  type DocumentKind,
  type Tables,
} from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth";
import { Button, Card, inputClass } from "@/components/ui";

type Doc = Tables<"case_documents"> & { uploader: { full_name: string } | null };
type Check = Tables<"document_checks">;

const isChecked = (kind: string) => (CHECKED_DOCUMENT_KINDS as readonly string[]).includes(kind);

const METHOD_LABEL: Record<string, string> = {
  ai: "Read by AI",
  pdf_text: "Read from the PDF text",
  manual: "Entered by a verifier",
};

/**
 * Documents attached to a case. Files live in the private `documents` bucket; the link to
 * open one is signed and expires after five minutes. Staff can add a document brought to the office.
 */
export function CaseDocuments({ caseId, suggested }: { caseId: string; suggested: DocumentKind[] }) {
  const { session, hasRole } = useAuth();
  const [docs, setDocs] = useState<Doc[] | null>(null);
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [reading, setReading] = useState<string | null>(null);
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
    const { data: ch } = await supabase().from("document_checks").select("*").eq("case_id", caseId);
    setChecks(Object.fromEntries((ch ?? []).map((c) => [c.document_id, c])));
  }, [caseId]);

  /** Ask the server to read a receipt, bill or mark sheet. It only flags; a verifier decides. */
  async function read(documentId: string) {
    setReading(documentId);
    try {
      const { data, error } = await supabase().functions.invoke<{ checked: boolean; reason?: string }>("check-document", {
        body: { document_id: documentId },
      });
      if (error) throw error;
      if (data && !data.checked && data.reason) setError(`${data.reason}. Enter what it says below.`);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setReading(null);
    }
  }

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
      const { data: doc, error } = await supabase()
        .from("case_documents")
        .insert({ case_id: caseId, kind, storage_path: path, uploaded_by: session.user.id })
        .select("id")
        .single();
      if (error) throw error;
      setFile(null);
      // Every file is fingerprinted on the server; receipts and bills are also read.
      await read(doc.id);
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
      {Object.values(checks).some((c) => c.outcome === "mismatch") ? (
        <p role="alert" className="mt-2 rounded-lg border border-amber-600 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          A document does not match the application. Check it before verifying. It is also listed under Fraud flags.
        </p>
      ) : null}
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
            {isChecked(d.kind) ? (
              <DocumentCheck
                check={checks[d.id]}
                kind={d.kind}
                busy={reading === d.id}
                canRecord={hasRole("verifier") || hasRole("trustee")}
                onRead={() => void read(d.id)}
                onRecord={async (amount, name) => {
                  const { error } = await supabase().rpc("record_document_check", {
                    p_document: d.id,
                    p_method: "manual",
                    ...(amount !== null ? { p_amount: amount } : {}),
                    ...(name ? { p_name: name } : {}),
                  });
                  if (error) setError(errorMessage(error));
                  else await load();
                }}
              />
            ) : null}
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
          {busy ? "Uploading and reading…" : "Upload"}
        </Button>
      </div>
    </Card>
  );
}

/** What the check found on one document, and a form for a verifier to enter what it says. */
function DocumentCheck({
  check,
  kind,
  busy,
  canRecord,
  onRead,
  onRecord,
}: {
  check: Check | undefined;
  kind: string;
  busy: boolean;
  canRecord: boolean;
  onRead: () => void;
  onRecord: (amount: number | null, name: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const wantsAmount = kind !== "marksheet";

  const found = check
    ? [
        check.found_amount !== null ? `Amount ${rupees(check.found_amount)}` : null,
        check.found_name ? `Name ${check.found_name}` : null,
        check.found_institution ? check.found_institution : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="w-full">
      {!check ? (
        <p className="text-muted">
          Not read yet.{" "}
          <button onClick={onRead} disabled={busy} className="font-semibold text-brand underline disabled:opacity-50">
            {busy ? "Reading…" : "Read it now"}
          </button>
        </p>
      ) : check.outcome === "mismatch" ? (
        <div className="rounded-lg border border-amber-600 bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-semibold">Mismatch with the application</p>
          <ul className="mt-1 list-disc pl-5">
            {check.mismatches.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : check.outcome === "matches" ? (
        <p className="text-green-800 dark:text-green-300">
          <span className="font-semibold">Matches the application.</span>
        </p>
      ) : (
        <p className="text-muted">Could not be read automatically. A verifier should read it and enter what it says.</p>
      )}
      {check ? (
        <p className="mt-1 text-xs text-muted">
          {[...found, METHOD_LABEL[check.method] ?? check.method, formatDate(check.checked_at)].join(" · ")}
          {check.method !== "manual" ? " · AI and rules only flag; you decide." : ""}
        </p>
      ) : null}

      {canRecord ? (
        editing ? (
          <form
            className="mt-2 flex flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              await onRecord(amount ? Number(amount) : null, name.trim());
              setSaving(false);
              setEditing(false);
            }}
          >
            {wantsAmount ? (
              <label className="text-sm">
                <span className="mb-1 block text-muted">Amount on the document (₹)</span>
                <input className={`${inputClass} w-40`} inputMode="numeric" value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
              </label>
            ) : null}
            <label className="text-sm">
              <span className="mb-1 block text-muted">Name on the document</span>
              <input className={`${inputClass} w-56`} value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
            </label>
            <Button type="submit" disabled={saving || (!amount && !name.trim())}>{saving ? "Saving…" : "Save"}</Button>
            <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
          </form>
        ) : (
          <button onClick={() => setEditing(true)} className="mt-1 text-sm font-semibold text-brand underline">
            {check ? "Correct what it says" : "Enter what it says"}
          </button>
        )
      ) : null}
    </div>
  );
}
