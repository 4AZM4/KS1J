const rules = [
  "No case reaches donors until a verifier and a different trustee have both approved it.",
  "Sehme Sadaat goes only to verified Sadaat cases. Sehme Imam goes only to institutions with a verified ijazah.",
  "Every fund has its own ledger. Nothing is edited; corrections are new reversing entries.",
  "AI only flags and suggests. A person always approves, rejects or pays.",
];

export default function AdminOverview() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold">Overview</h1>
      <p className="mt-2 text-muted">
        {/* TODO(module: admin): counts per case status, fund balances, overdue loans, open fraud flags. */}
        Queue counts, fund balances and open flags will appear here.
      </p>
      <h2 className="mt-8 text-lg font-semibold">Rules this dashboard enforces</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        {rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}
