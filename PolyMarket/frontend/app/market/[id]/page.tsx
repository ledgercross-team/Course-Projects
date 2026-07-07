"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { isAddress } from "viem";
import { cents, fmtUsdc, useMarket } from "@/lib/markets";
import { TradePanel } from "@/components/TradePanel";
import { Countdown } from "@/components/ui/Countdown";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconChevronRight, IconClock } from "@/components/ui/icons";

export default function MarketPage() {
  const { id } = useParams<{ id: string }>();
  const address = isAddress(id) ? (id as `0x${string}`) : undefined;
  const { market, isLoading, resolver, creator, liquidityRedeemed, balYes, balNo } = useMarket(address);

  if (!address || (!isLoading && !market)) {
    return (
      <div className="py-24 text-center">
        <p className="text-lg font-semibold text-text">Market not found</p>
        <Link href="/" className="mt-2 inline-block text-sm text-blue-text hover:underline">
          ← Back to markets
        </Link>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="grid gap-5 py-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4 rounded-lg" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const pct = Math.round(market.priceYes * 100);
  const hasPosition = balYes > 0n || balNo > 0n;

  return (
    <div className="py-4">
      <div className="flex items-center gap-1.5 text-sm text-muted">
        <Link href="/" className="hover:text-text">
          Markets
        </Link>
        <IconChevronRight width={13} height={13} />
        <span className="line-clamp-1">{market.question}</span>
      </div>

      <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold leading-tight text-textbright sm:text-2xl">{market.question}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span className="tnum font-medium">{fmtUsdc(market.reserveYes + market.reserveNo, 0)} mUSDC liquidity</span>
            <span className="flex items-center gap-1">
              <IconClock width={13} height={13} />
              {market.resolved ? "Resolved" : <Countdown to={market.closeTime} />}
            </span>
          </div>

          {/* headline chance */}
          <div className="mt-4 flex items-end gap-2">
            <span className={`tnum text-4xl font-bold ${pct >= 50 ? "text-yes-text" : "text-no-text"}`}>{pct}%</span>
            <span className="pb-1 text-sm font-medium text-muted">chance</span>
          </div>

          {/* yes/no breakdown */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatCard label="Yes" value={`${cents(market.priceYes)}¢`} sub={`${fmtUsdc(market.reserveYes, 0)} shares in pool`} accent="text-yes-text" />
            <StatCard label="No" value={`${cents(1 - market.priceYes)}¢`} sub={`${fmtUsdc(market.reserveNo, 0)} shares in pool`} accent="text-no-text" />
          </div>

          {/* your position */}
          {hasPosition && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
              <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted">
                Your position
              </p>
              {balYes > 0n && <PositionRow side="Yes" shares={balYes} won={market.resolved && market.outcome === 1} resolved={market.resolved} />}
              {balNo > 0n && <PositionRow side="No" shares={balNo} won={market.resolved && market.outcome === 2} resolved={market.resolved} />}
            </div>
          )}

          {/* rules */}
          <div className="mt-4 rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Rules</p>
            <p className="mt-2 text-sm leading-relaxed text-subtle">
              Trading closes on{" "}
              <span className="font-semibold text-text">
                {new Date(market.closeTime * 1000).toLocaleString(undefined, { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
              </span>
              . After close, the resolver reports the outcome on-chain. Each winning share redeems for{" "}
              <span className="font-semibold text-text">1 mUSDC</span>; losing shares are worth 0. Prices reflect the
              pool&apos;s live implied probability.
            </p>
            <div className="mt-3 space-y-1 border-t border-border/70 pt-3 text-xs text-muted">
              <AddrRow label="Market" addr={market.address} />
              {resolver && <AddrRow label="Resolver" addr={resolver} />}
              {creator && <AddrRow label="Creator" addr={creator} />}
            </div>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <TradePanel
            market={market}
            resolver={resolver}
            creator={creator}
            liquidityRedeemed={liquidityRedeemed}
            balYes={balYes}
            balNo={balNo}
          />
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`tnum mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      <p className="tnum mt-0.5 text-xs text-faint">{sub}</p>
    </div>
  );
}

function PositionRow({ side, shares, won, resolved }: { side: "Yes" | "No"; shares: bigint; won: boolean; resolved: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 text-sm last:border-0">
      <span className={`font-bold ${side === "Yes" ? "text-yes-text" : "text-no-text"}`}>{side}</span>
      <span className="tnum text-subtle">{fmtUsdc(shares)} shares</span>
      <span className="tnum ml-auto font-semibold text-text">
        {resolved ? (won ? `pays ${fmtUsdc(shares)} mUSDC` : "worth 0") : `pays ${fmtUsdc(shares)} mUSDC if ${side} wins`}
      </span>
    </div>
  );
}

function AddrRow({ label, addr }: { label: string; addr: string }) {
  return (
    <p className="flex justify-between gap-3">
      <span>{label}</span>
      <span className="tnum truncate">{addr}</span>
    </p>
  );
}
