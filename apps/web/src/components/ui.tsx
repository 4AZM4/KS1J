"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-brand text-background hover:opacity-90",
    secondary: "border border-border bg-card hover:bg-background",
    danger: "border border-red-600 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950",
  }[variant];
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 shadow-soft ${className}`}>{children}</div>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const t = {
    neutral: "border-border text-muted",
    good: "border-green-600 text-green-700 dark:text-green-400",
    warn: "border-amber-600 text-amber-700 dark:text-amber-400",
    bad: "border-red-600 text-red-700 dark:text-red-400",
  }[tone];
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold ${t}`}>{children}</span>;
}

export function Alert({ children, tone = "bad" }: { children: ReactNode; tone?: "bad" | "good" }) {
  const t =
    tone === "bad"
      ? "border-red-600 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
      : "border-green-600 bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200";
  return (
    <p role="alert" className={`rounded-lg border px-3 py-2 text-sm ${t}`}>
      {children}
    </p>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-base outline-none focus:border-brand";
