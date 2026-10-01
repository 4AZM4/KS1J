/**
 * Downloads rows as a CSV file that opens directly in Excel (UTF-8 with a byte-order mark, so names
 * and the rupee sign display correctly). Amounts stay plain numbers so Excel can add them up.
 */
export function downloadCsv(fileName: string, header: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Quote when needed; neutralise leading characters Excel would treat as a formula.
    const safe = /^[=+\-@\t\r]/.test(s) && typeof v !== "number" ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const text = "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** "2026-10-01" for file names. */
export const today = () => new Date().toISOString().slice(0, 10);
