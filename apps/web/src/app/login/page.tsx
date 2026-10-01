"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@ks1j/shared";
import { DEMO_MODE, errorMessage, supabase } from "@/lib/supabase";
import { Alert, Button, Card, inputClass } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
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
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="text-2xl font-bold">Sign in to KS1J</h1>
      <p className="mt-2 text-muted">Use the phone number registered with the Jamaat.</p>

      {error ? <div className="mt-4"><Alert>{error}</Alert></div> : null}

      <Card className="mt-6">
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
                router.push("/admin");
              }
            });
          }}
          className="space-y-3"
        >
          <label className="block text-sm font-semibold" htmlFor="phone">Mobile number</label>
          <input id="phone" className={inputClass} inputMode="tel" placeholder="98765 43210" value={phone}
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
                      router.push("/admin");
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
  );
}
