/**
 * Where each fund may go. Solid lines are allowed; dashed lines with a cross are payments the
 * database refuses (check_donation_rules). Shown on medium screens and up; small screens get the list.
 */
const LEFT = [
  { label: "Sehme Sadaat", y: 40 },
  { label: "General donations", y: 120 },
  { label: "Sehme Imam", y: 200 },
  { label: "Loan repayments", y: 280 },
  { label: "Lawajam", y: 360 },
];
const RIGHT = [
  { label: "Verified Sadaat families", y: 40 },
  { label: "Non-Sadaat families", y: 120 },
  { label: "Institutions with ijazah", y: 200 },
  { label: "The next student's loan", y: 280 },
  { label: "Jamaat running costs", y: 360 },
];
const ALLOWED: [number, number][] = [
  [40, 40],
  [120, 40],
  [120, 120],
  [200, 200],
  [280, 280],
  [360, 360],
];
const REFUSED: [number, number][] = [
  [40, 120], // Sehme Sadaat to a Non-Sadaat family
  [200, 120], // Sehme Imam to individuals
];

const X1 = 214;
const X2 = 506;
const curve = (a: number, b: number) => `M${X1} ${a} C${(X1 + X2) / 2} ${a} ${(X1 + X2) / 2} ${b} ${X2} ${b}`;

export function FundFlow() {
  return (
    <figure className="hidden md:block">
      <svg viewBox="0 0 720 400" className="w-full" role="img" aria-labelledby="fundflow-title fundflow-desc">
        <title id="fundflow-title">Where each fund may go</title>
        <desc id="fundflow-desc">
          Sehme Sadaat goes only to verified Sadaat families. General donations go to any verified family. Sehme Imam goes
          only to institutions with an ijazah. Loan repayments fund the next student. Lawajam covers Jamaat running costs.
          Sehme Sadaat to a Non-Sadaat family, and Sehme Imam to an individual, are refused.
        </desc>

        {ALLOWED.map(([a, b]) => (
          <path key={`ok-${a}-${b}`} d={curve(a, b)} fill="none" className="stroke-deep" strokeWidth="2.5" />
        ))}
        {REFUSED.map(([a, b]) => {
          // Marker a third of the way along the curve, clear of the crossing in the middle.
          const t = 0.3;
          const cx = (X1 + X2) / 2;
          const mx = (1 - t) ** 3 * X1 + 3 * (1 - t) ** 2 * t * cx + 3 * (1 - t) * t ** 2 * cx + t ** 3 * X2;
          const my = (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3 * b;
          return (
            <g key={`no-${a}-${b}`}>
              <path d={curve(a, b)} fill="none" className="stroke-[#b42318]" strokeWidth="2" strokeDasharray="6 6" opacity="0.8" />
              <circle cx={mx} cy={my} r="12" className="fill-paper stroke-[#b42318]" strokeWidth="2" />
              <path d={`M${mx - 5} ${my - 5}L${mx + 5} ${my + 5}M${mx + 5} ${my - 5}L${mx - 5} ${my + 5}`} className="stroke-[#b42318]" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          );
        })}

        {LEFT.map((n) => (
          <g key={n.label}>
            <rect x="0" y={n.y - 22} width={X1} height="44" rx="22" className="fill-paper stroke-lapis" strokeWidth="2" />
            <text x={X1 / 2} y={n.y + 6} textAnchor="middle" className="fill-lapis text-[17px] font-bold">
              {n.label}
            </text>
          </g>
        ))}
        {RIGHT.map((n) => (
          <g key={n.label}>
            <rect x={X2} y={n.y - 22} width={720 - X2} height="44" rx="10" className="fill-card stroke-border" strokeWidth="1.5" />
            <text x={X2 + 16} y={n.y + 6} className="fill-ink text-[16px]">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-base text-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-[3px] w-8 bg-deep" /> Allowed
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block w-8 border-t-2 border-dashed border-[#b42318]" /> Refused by the system
        </span>
      </figcaption>
    </figure>
  );
}
