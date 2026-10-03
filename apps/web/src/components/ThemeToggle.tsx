"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const KEY = "ks1j-theme";

/**
 * Runs before the page paints (see app/layout.tsx), so there is no flash of the wrong theme:
 * a saved choice wins, otherwise the device setting.
 */
export const themeScript = `(function(){var t;try{t=localStorage.getItem('${KEY}')}catch(e){}if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}var d=document.documentElement;d.dataset.theme=t;d.style.colorScheme=t})()`;

function apply(t: Theme) {
  const d = document.documentElement;
  d.dataset.theme = t;
  d.style.colorScheme = t;
  try {
    localStorage.setItem(KEY, t);
  } catch {
    // Private mode or blocked storage: the switch still works for this visit.
  }
}

/** A sun / moon button for the nav bars. Shows what you will switch to. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => {
        apply(next);
        setTheme(next);
      }}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-card ${className}`}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {theme === "dark" ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </>
        ) : (
          <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
        )}
      </svg>
    </button>
  );
}
