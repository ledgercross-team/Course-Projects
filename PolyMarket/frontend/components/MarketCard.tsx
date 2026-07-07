"use client";

import Link from "next/link";
import { cents, fmtUsdc, type MarketData } from "@/lib/markets";
import { CloseLabel } from "@/components/ui/Countdown";

export function MarketCard({ market, index = 0 }: { market: MarketData; index?: number }) {
  const pct = Math.round(market.priceYes * 100);

  return (
    <Link
      href={`/market/${market.address}`}
      style={{ animationDelay: `${Math.min(index, 12) * 35}ms` }}
      className="animate-fadeUp group flex flex-col rounded-xl border border-border bg-card p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-borderstrong hover:shadow-pop"
    >
      <div className="flex items-start gap-2.5">
        <h3 className="line-clamp-2 min-h-[38px] flex-1 pt-0.5 text-[14px] font-semibold leading-snug text-text">
          {market.question}
        </h3>
        <div className="shrink-0">
          <Ring pct={pct} />
        </div>
      </div>

      <div className="mt-3 grid flex-1 grid-cols-2 items-end gap-2">
        <PriceChip tone="yes" label="Yes" price={market.priceYes} />
        <PriceChip tone="no" label="No" price={1 - market.priceYes} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2.5 text-xs text-muted">
        <span className="tnum font-medium">{fmtUsdc(market.reserveYes + market.reserveNo, 0)} liquidity</span>
        {market.resolved ? (
          <span className={`font-bold ${market.outcome === 1 ? "text-yes-text" : "text-no-text"}`}>
            Resolved {market.outcome === 1 ? "YES" : "NO"}
          </span>
        ) : (
          <CloseLabel to={market.closeTime} className="tnum" />
        )}
      </div>
    </Link>
  );
}

function PriceChip({ tone, label, price }: { tone: "yes" | "no"; label: string; price: number }) {
  const cls = tone === "yes" ? "bg-yes-soft text-yes-text" : "bg-no-soft text-no-text";
  return (
    <span className={`flex items-center justify-center gap-1 rounded-lg py-2 text-sm font-bold ${cls}`}>
      {label} <span className="tnum">{cents(price)}¢</span>
    </span>
  );
}

/** Small circular probability gauge. */
function Ring({ pct }: { pct: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct / 100);
  const color = pct >= 50 ? "#3db468" : "#e64848";
  return (
    <div className="relative grid h-10 w-10 place-items-center">
      <svg width="40" height="40" viewBox="0 0 40 40" className="-rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="#252c33" strokeWidth="3.5" />
        <circle
          cx="20"
          cy="20"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="tnum absolute text-[11px] font-bold" style={{ color }}>
        {pct}
      </span>
    </div>
  );
}
