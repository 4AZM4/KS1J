"use client";

import Link from "next/link";
import { useState } from "react";
import { signUpMember, signupProblem, type SignupInput } from "@ks1j/shared";
import { errorMessage, supabase } from "@/lib/supabase";
import { Alert, Button, Card, inputClass } from "@/components/ui";

const MEMBER_APP_URL = process.env.NEXT_PUBLIC_MEMBER_APP_URL ?? "https://4azm4.github.io/KS1J/app/";

const EMPTY: SignupInput = { fullName: "", email: "", password: "", phone: "", area: "", address: "", jamaatNumber: "" };

export default function SignupPage() {
  const [form, setForm] = useState<SignupInput>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"confirm-email" | "signed-in" | null>(null);

  const set = (k: keyof SignupInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = signupProblem(form);
    if (problem) return setError(problem);
    setBusy(true);
    setError(null);
    try {
      const redirect = window.location.href.replace(/signup\/?(\?.*)?$/, "login/");
      const { needsEmailConfirmation } = await signUpMember(supabase(), form, redirect);
      setDone(needsEmailConfirmation ? "confirm-email" : "signed-in");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
        <Card>
          <h1 className="text-2xl font-bold">Your account is created</h1>
          {done === "confirm-email" ? (
            <p className="mt-3 text-lg">
              We sent a link to <strong>{form.email.trim()}</strong>. Open it to confirm your email, then sign in.
            </p>
          ) : null}
          <p className="mt-3 text-lg text-muted">
            A Jamaat verifier will now confirm your membership and link you to your household. You can already use the
            app; family dues and loans appear once you are verified.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={MEMBER_APP_URL} className="rounded-lg bg-brand px-4 py-2 font-semibold text-background">
              Open the member app
            </a>
            <Link href="/login" className="rounded-lg border border-border px-4 py-2 font-semibold">
              Sign in
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="text-2xl font-bold">Create your KS1J account</h1>
      <p className="mt-2 text-muted">
        For members of KSI Jamaat Mumbai. A verifier checks every new account before family details are shared.
      </p>
      {error ? (
        <div className="mt-4">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      <Card className="mt-6">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field id="name" label="Full name" value={form.fullName} onChange={set("fullName")} autoComplete="name" />
          <Field id="phone" label="Mobile number" value={form.phone} onChange={set("phone")} autoComplete="tel" inputMode="tel" placeholder="98765 43210" />
          <Field id="email" label="Email" type="email" value={form.email} onChange={set("email")} autoComplete="email" />
          <Field
            id="password"
            label="Password"
            hint="At least 8 characters."
            type="password"
            value={form.password}
            onChange={set("password")}
            autoComplete="new-password"
          />
          <Field id="area" label="Area" hint="For example Dongri, Mazgaon or Andheri." value={form.area} onChange={set("area")} />
          <div>
            <label className="block text-sm font-semibold" htmlFor="address">
              Address (optional)
            </label>
            <textarea id="address" className={`${inputClass} mt-1 min-h-20`} value={form.address} onChange={set("address")} maxLength={300} />
          </div>
          <Field
            id="jamaat"
            label="Jamaat membership number (optional)"
            hint="If you have one. It helps the verifier find your family."
            value={form.jamaatNumber ?? ""}
            onChange={set("jamaatNumber")}
          />
          <Button type="submit" disabled={busy} className="w-full py-3 text-base">
            {busy ? "Creating your account…" : "Create account"}
          </Button>
        </form>
      </Card>
      <p className="mt-6 text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}

function Field({
  id,
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-semibold" htmlFor={id}>
        {label}
      </label>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      <input id={id} className={`${inputClass} mt-1`} {...props} />
    </div>
  );
}
