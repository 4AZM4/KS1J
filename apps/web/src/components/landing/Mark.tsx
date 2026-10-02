/**
 * KS1J logo: a gold eight-pointed star (the khatam of Jamaat tiles and woodwork) on a deep green tile,
 * with a "1" in the middle: one place for the whole Jamaat. An original mark for this app; it is not the KSIJ logo.
 * Source files: docs/brand/.
 */
const STAR =
  "256.00,78.00 308.13,130.13 381.87,130.13 381.87,203.87 434.00,256.00 381.87,308.13 381.87,381.87 308.13,381.87 256.00,434.00 203.87,381.87 130.13,381.87 130.13,308.13 78.00,256.00 130.13,203.87 130.13,130.13 203.87,130.13";
const STAR_LINE =
  "256.00,106.00 299.93,149.93 362.07,149.93 362.07,212.07 406.00,256.00 362.07,299.93 362.07,362.07 299.93,362.07 256.00,406.00 212.07,362.07 149.93,362.07 149.93,299.93 106.00,256.00 149.93,212.07 149.93,149.93 212.07,149.93";
const ONE = "M242.1 349V228.3H201.2V195.1Q215.5 195.1 224.9 193.7Q234.3 192.2 240.7 186.6Q247 181.1 251.8 169H282.8V349Z";

export function KS1JMark({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <rect width="512" height="512" rx="116" fill="#0B4D3A" />
      <polygon points={STAR} fill="#C9A24A" />
      <polygon points={STAR_LINE} fill="none" stroke="#0B4D3A" strokeWidth="6" />
      <path d={ONE} fill="#0B4D3A" />
    </svg>
  );
}

/** The KS1J letters, outlined from Atkinson Hyperlegible Bold (the site font) so they look the same everywhere. The "1" is gold. */
export function KS1JWordmark({ className = "", tone = "ink" }: { className?: string; tone?: "ink" | "light" }) {
  const main = tone === "light" ? "#FFFFFF" : "#0B4D3A";
  return (
    <svg viewBox="0 -682 2258 696" className={className} role="img" aria-label="KS1J">
        <path transform="translate(-44 0)" d="M44 0V-668H202V-403L443 -668H636L372 -382L649 0H466L270 -272L202 -197V0Z" fill={main} />
        <path transform="translate(-44 0)" d="M993 12Q884 12 809.5 -32.5Q735 -77 704 -157L848 -209Q862 -161 900.5 -138.0Q939 -115 994 -115Q1023 -115 1050.0 -121.5Q1077 -128 1095.0 -143.5Q1113 -159 1113 -185Q1113 -220 1079.0 -239.5Q1045 -259 991 -269L910 -285Q856 -296 809.5 -318.5Q763 -341 735.0 -378.5Q707 -416 707 -473Q707 -527 732.0 -566.0Q757 -605 798.5 -630.0Q840 -655 890.0 -667.5Q940 -680 990 -680Q1044 -680 1094.5 -665.0Q1145 -650 1185.0 -618.5Q1225 -587 1246 -535L1103 -483Q1090 -517 1056.5 -535.0Q1023 -553 976 -553Q930 -553 899.5 -536.5Q869 -520 869 -489Q869 -464 890.0 -446.0Q911 -428 945 -421L1035 -403Q1076 -395 1118.0 -382.5Q1160 -370 1195.5 -349.5Q1231 -329 1253.0 -295.0Q1275 -261 1275 -209Q1275 -156 1250.5 -114.5Q1226 -73 1185.5 -45.0Q1145 -17 1095.0 -2.5Q1045 12 993 12Z" fill={main} />
        <path transform="translate(-44 0)" d="M1517 0V-448H1365V-571Q1418 -571 1453.0 -576.5Q1488 -582 1511.5 -602.5Q1535 -623 1553 -668H1668V0Z" fill={"#C9A24A"} />
        <path transform="translate(-44 0)" d="M2041 12Q1936 12 1874.0 -39.0Q1812 -90 1791 -175L1936 -228Q1942 -200 1954.5 -173.5Q1967 -147 1988.5 -130.0Q2010 -113 2041 -113Q2091 -113 2117.5 -144.5Q2144 -176 2144 -256V-668H2302V-256Q2302 -131 2235.5 -59.5Q2169 12 2041 12Z" fill={main} />
    </svg>
  );
}

/** Mark and letters together, for the header and footer. */
export function KS1JLockup({ tone = "ink", size = "md" }: { tone?: "ink" | "light"; size?: "md" | "sm" }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <KS1JMark className={size === "sm" ? "h-7 w-7" : "h-9 w-9"} />
      <KS1JWordmark tone={tone} className={size === "sm" ? "h-5 w-auto" : "h-6 w-auto"} />
    </span>
  );
}
