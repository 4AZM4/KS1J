"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@ks1j/shared";
import { DEMO_MODE, errorMessage, supabase } from "@/lib/supabase";
import { Alert, Button, Card, inputClass } from "@/components/ui";
import { useAuth } from "@/components/auth";

// Text-message codes need an SMS provider in Supabase; off until the Jamaat sets one up.
const PHONE_LOGIN = process.env.NEXT_PUBLIC_PHONE_LOGIN === "true";

/** Back to the page that sent them here; otherwise staff go to the dashboard and members to the cases. */
async function afterSignIn(): Promise<string> {
  const next = new URLSearchParams(window.location.search).get("next");
  // Only a page on this site: no "//other.site" or "/\\other.site" tricks.
  if (next && /^\/(?![/\\])/.test(next) && !/[\\\s]/.test(next)) return next;
  const db = supabase();
  const { data: user } = await db.auth.getUser();
  const { data: roles } = await db.from("member_roles").select("role").eq("member_id", user.user?.id ?? "");
  return roles && roles.length > 0 ? "/admin" : "/cases";
}

export default function LoginPage() {
  const router = useRouter();
  const { session, member, isStaff, signOut } = useAuth();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const phoneE164 = () => (phone.startsWith("+") ? phone : `+91${phone.replace(/\D/g, "")}`);

  return (
    <div className="flex-1 bg-paper text-ink">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold">Sign in to KS1J</h1>
      <p className="mt-2 text-muted">
        New to KS1J? <Link href="/signup" className="font-semibold text-brand underline">Create an account</Link>
      </p>

      {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}

      {session ? (
        <Card className="mt-6">
          <p className="text-lg">
            You are signed in as <strong>{member?.full_name ?? session.user.email}</strong>.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={isStaff ? "/admin" : "/cases"} className="rounded-xl bg-deep px-5 py-3 text-base font-bold text-white">
              {isStaff ? "Go to the dashboard" : "Go to cases"}
            </Link>
            <button onClick={() => void signOut()} className="rounded-xl border border-border px-5 py-3 text-base font-bold">
              Sign in as someone else
            </button>
          </div>
        </Card>
      ) : null}

      <Card className="mt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run("email", async () => {
              const { error } = await supabase().auth.signInWithPassword({ email: email.trim(), password });
              if (error) throw error;
              router.push(await afterSignIn());
            });
          }}
          className="space-y-3"
        >
          <label className="block text-sm font-semibold" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className={inputClass} value={email}
            onChange={(e) => setEmail(e.target.value)} />
          <label className="block text-sm font-semibold" htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" className={inputClass} value={password}
            onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" disabled={busy !== null || !email || !password}>
            {busy === "email" ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>

      {PHONE_LOGIN ? (
        <>
      <p className="mt-6 text-sm text-muted">Or with your mobile number:</p>

      <Card className="mt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run("phone", async () => {
              if (!otpSent) {
                const { error } = await supabase().auth.signInWithOtp({ phone: phoneE164() });
                if (error) throw error;
                setOtpSent(true);
              } else {
                const { error } = await supabase().auth.verifyOtp({ phone: phoneE164(), token: otp, type: "sms" });
                if (error) throw error;
                router.push(await afterSignIn());
              }
            });
          }}
          className="space-y-3"
        >
          <label className="block text-sm font-semibold" htmlFor="phone">Mobile number</label>
          <input id="phone" className={inputClass} inputMode="tel" placeholder="+91 12345 67890" value={phone}
            onChange={(e) => setPhone(e.target.value)} disabled={otpSent} />
          {otpSent ? (
            <>
              <label className="block text-sm font-semibold" htmlFor="otp">6-digit code</label>
              <input id="otp" className={inputClass} inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} />
            </>
          ) : null}
          <Button type="submit" disabled={busy !== null || !phone}>
            {otpSent ? "Verify and sign in" : "Send code"}
          </Button>
        </form>
      </Card>
        </>
      ) : null}

      {DEMO_MODE ? (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Demo accounts</h2>
          <p className="mt-1 text-sm text-muted">Fictional people, for the hackathon demo only.</p>
          <ul className="mt-3 space-y-2">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-brand disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() =>
                    run(a.email, async () => {
                      const { error } = await supabase().auth.signInWithPassword({ email: a.email, password: DEMO_PASSWORD });
                      if (error) throw error;
                      router.push(await afterSignIn());
                    })
                  }
                >
                  <span className="font-semibold">{a.name}</span>
                  <span className="text-sm text-muted">{busy === a.email ? "Signing in…" : a.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
    </div>
  );
}
