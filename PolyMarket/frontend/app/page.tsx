"use client";

import { useMemo } from "react";
import { useMarkets } from "@/lib/markets";
import { MarketCard } from "@/components/MarketCard";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Page() {
  const { markets, isLoading, error } = useMarkets();

  // open markets first (soonest close first), resolved at the end
  const list = useMemo(
    () =>
      [...markets].sort((a, b) =>
        a.resolved !== b.resolved ? (a.resolved ? 1 : -1) : a.closeTime - b.closeTime
      ),
    [markets]
  );

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold text-textbright">Markets</h1>
      <p className="mt-1 text-sm text-muted">Live on-chain binary prediction markets. Prices are implied probabilities.</p>

      <div className="mt-5">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <Empty title="Could not load markets" sub="Check the RPC and contract addresses in .env.local, then reload." />
        ) : list.length === 0 ? (
          <Empty title="No markets yet" sub="Run the Deploy script to create the factory and demo markets, then set NEXT_PUBLIC_FACTORY_ADDRESS." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((m, i) => (
              <MarketCard key={m.address} market={m} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border py-16 text-center">
      <p className="font-semibold text-text">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{sub}</p>
    </div>
  );
}
