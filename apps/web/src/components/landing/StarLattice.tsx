/**
 * Khatam lattice: eight-pointed stars (two overlapping squares) joined edge to edge,
 * the pattern found on Jamaat tiles and woodwork. Drawn as a repeating SVG tile.
 */
export function StarLattice({ className = "", id = "khatam" }: { className?: string; id?: string }) {
  return (
    <svg aria-hidden="true" className={className} width="100%" height="100%">
      <defs>
        <pattern id={id} width="96" height="96" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round">
            {/* the two squares of the star */}
            <rect x="26" y="26" width="44" height="44" />
            <polygon points="48,17 79,48 48,79 17,48" />
            {/* joins to the neighbouring stars */}
            <path d="M48 0V17M48 79V96M0 48H17M79 48H96M0 0L26 26M96 0L70 26M0 96L26 70M96 96L70 70" />
            <circle cx="48" cy="48" r="6" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
