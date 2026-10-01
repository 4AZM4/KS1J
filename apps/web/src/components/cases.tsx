import { rupees, type Database } from "@ks1j/shared";

export type PublicCase = Database["public"]["Functions"]["list_public_cases"]["Returns"][number];

export function CaseProgress({ raised, target, funded }: { raised: number; target: number; funded: boolean }) {
  const pct = target > 0 ? Math.min(100, Math.round((raised / target) * 100)) : 0;
  return (
    <div className="mt-4">
      <div
        role="progressbar"
        aria-label="Raised so far"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={raised}
        className="h-3 overflow-hidden rounded-full bg-background"
      >
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-base">
        <span className="font-bold">{rupees(raised)}</span> raised{" "}
        {funded ? <span className="text-muted">· fully funded</span> : <span className="text-muted">of {rupees(target)}</span>}
      </p>
    </div>
  );
}
