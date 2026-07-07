"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { USDC_ADDRESS, USDC_DECIMALS, erc20Abi } from "@/lib/contracts";
import { cents, fmtUsdc, useMarkets, usePositions } from "@/lib/markets";
import { Skeleton } from "@/components/ui/Skeleton";
import { IconWallet, IconArrowUpRight } from "@/components/ui/icons";

export default function PortfolioPage() {
  const { address } = useAccount();
  const { markets, isLoading: loadingMarkets } = useMarkets();
  const { positions, isLoading: loadingPositions } = usePositions(markets);

  const { data: usdcBal } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const cash = usdcBal !== undefined ? Number(formatUnits(usdcBal, USDC_DECIMALS)) : 0;
  const positionsValue = positions.reduce((s, p) => s + p.value, 0);
  const loading = loadingMarkets || loadingPositions;

  if (!address) {
    return (
      <div className="py-24 text-center">
        <p className="text-lg font-semibold text-text">Connect your wallet</p>
        <p className="mt-1 text-sm text-muted">Your on-chain positions and mUSDC balance will show up here.</p>
      </div>
    );
  }

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold text-textbright">Portfolio</h1>
      <p className="mt-1 text-sm text-muted">On-chain positions held by {address.slice(0, 6)}…{address.slice(-4)}.</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Portfolio value" value={`$${(cash + positionsValue).toFixed(2)}`} accent="text-textbright" />
        <Stat label="Cash (mUSDC)" value={`$${cash.toFixed(2)}`} />
        <Stat label="Positions" value={`$${positionsValue.toFixed(2)}`} />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold text-textbright">
          Positions <span className="tnum text-muted">({positions.length})</span>
        </h2>

        {loading ? (
          <Skeleton className="h-32 rounded-2xl" />
        ) : positions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-cardhover text-muted">
              <IconWallet />
            </div>
            <p className="font-semibold text-text">No positions yet</p>
            <p className="mt-1 text-sm text-muted">Grab mUSDC from the faucet and place your first trade.</p>
            <Link href="/" className="mt-4 inline-flex items-center gap-1 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-hover">
              Browse markets <IconArrowUpRight width={15} height={15} />
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="hidden grid-cols-[2.4fr_1fr_1fr_1fr_1fr] gap-3 border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-faint sm:grid">
              <span>Market</span>
              <span className="text-right">Side</span>
              <span className="text-right">Shares</span>
              <span className="text-right">Price</span>
              <span className="text-right">Value</span>
            </div>
            {positions.map((p) => {
              const won = p.market.resolved && (p.market.outcome === 1) === p.isYes;
              const price = p.market.resolved ? (won ? 1 : 0) : p.isYes ? p.market.priceYes : 1 - p.market.priceYes;
              return (
                <Link
                  key={`${p.market.address}-${p.isYes}`}
                  href={`/market/${p.market.address}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-0 hover:bg-cardhover/50 sm:grid-cols-[2.4fr_1fr_1fr_1fr_1fr]"
                >
                  <span className="min-w-0">
                    <span className="line-clamp-1 text-sm font-semibold text-text">{p.market.question}</span>
                    {p.market.resolved && (
                      <span className={`text-xs font-semibold ${won ? "text-yes-text" : "text-no-text"}`}>
                        {won ? "Won — redeem on market page" : "Lost"}
                      </span>
                    )}
                  </span>
                  <span className={`text-right text-sm font-bold ${p.isYes ? "text-yes-text" : "text-no-text"}`}>
                    {p.isYes ? "Yes" : "No"}
                  </span>
                  <span className="tnum hidden text-right text-sm text-subtle sm:block">{fmtUsdc(p.shares)}</span>
                  <span className="tnum hidden text-right text-sm text-subtle sm:block">{cents(price)}¢</span>
                  <span className="tnum text-right text-sm font-bold text-text">${p.value.toFixed(2)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent = "text-text" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className={`tnum mt-1.5 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
