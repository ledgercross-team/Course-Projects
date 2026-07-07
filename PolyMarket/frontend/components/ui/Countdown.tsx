"use client";

import { useEffect, useState } from "react";

/** Live countdown to a unix (seconds) deadline. Renders nothing until mounted to avoid SSR drift. */
export function Countdown({ to, className = "" }: { to: number; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);
  if (now == null) return <span className={className} suppressHydrationWarning />;
  const secs = to - Math.floor(now / 1000);
  return <span className={`tnum ${className}`} suppressHydrationWarning>{fmt(secs)}</span>;
}

function fmt(s: number): string {
  if (s <= 0) return "Closed";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d >= 1) return `${d}d ${h}h`;
  if (h >= 1) return `${h}h ${m}m`;
  return `${m}m ${sec}s`;
}

/** Compact "closes in" label for cards. */
export function CloseLabel({ to, className = "" }: { to: number; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);
  if (now == null) return <span className={className} suppressHydrationWarning />;
  const secs = to - Math.floor(now / 1000);
  if (secs <= 0) return <span className={className}>Closed</span>;
  const d = Math.floor(secs / 86400);
  const label = d >= 1 ? `${d}d` : `${Math.floor(secs / 3600)}h`;
  return <span className={className} suppressHydrationWarning>{label}</span>;
}
