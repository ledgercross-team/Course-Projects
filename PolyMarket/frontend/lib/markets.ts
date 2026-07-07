"use client";

import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { FACTORY_ADDRESS, USDC_DECIMALS, factoryAbi, marketAbi } from "./contracts";

export const REFRESH_MS = 10_000; // poll cadence for chain reads (~1 block)

export type MarketData = {
  address: `0x${string}`;
  question: string;
  closeTime: number; // unix seconds
  reserveYes: bigint;
  reserveNo: bigint;
  priceYes: number; // 0..1, implied probability
  resolved: boolean;
  outcome: number; // 0 unresolved · 1 yes · 2 no
};

const FIELDS = ["question", "closeTime", "reserveYes", "reserveNo", "resolved", "outcome"] as const;

function toMarket(address: `0x${string}`, r: (unknown | undefined)[]): MarketData | null {
  const [question, closeTime, reserveYes, reserveNo, resolved, outcome] = r;
  if (question === undefined || reserveYes === undefined || reserveNo === undefined) return null;
  const yes = reserveYes as bigint;
  const no = reserveNo as bigint;
  return {
    address,
    question: question as string,
    closeTime: Number(closeTime as bigint),
    reserveYes: yes,
    reserveNo: no,
    priceYes: yes + no === 0n ? 0.5 : Number((no * 10_000n) / (yes + no)) / 10_000,
    resolved: resolved as boolean,
    outcome: Number(outcome as number),
  };
}

/** All markets registered in the factory, with live on-chain state. */
export function useMarkets() {
  const { data: addresses, isLoading: loadingList, error } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryAbi,
    functionName: "allMarkets",
    query: { refetchInterval: REFRESH_MS },
  });

  const { data: reads, isLoading: loadingData } = useReadContracts({
    contracts: (addresses ?? []).flatMap((address) =>
      FIELDS.map((functionName) => ({ address, abi: marketAbi, functionName }))
    ),
    query: { enabled: !!addresses?.length, refetchInterval: REFRESH_MS },
  });

  const markets = useMemo<MarketData[]>(() => {
    if (!addresses || !reads) return [];
    return addresses
      .map((addr, i) => toMarket(addr, FIELDS.map((_, j) => reads[i * FIELDS.length + j]?.result)))
      .filter((m): m is MarketData => m !== null);
  }, [addresses, reads]);

  return { markets, isLoading: loadingList || (!!addresses?.length && loadingData), error };
}

/** One market's full state, plus roles and the connected user's shares. */
export function useMarket(address: `0x${string}` | undefined) {
  const { address: user } = useAccount();
  const zero = "0x0000000000000000000000000000000000000000" as const;

  const { data: reads, isLoading } = useReadContracts({
    contracts: address
      ? [
          ...FIELDS.map((functionName) => ({ address, abi: marketAbi, functionName })),
          { address, abi: marketAbi, functionName: "resolver" },
          { address, abi: marketAbi, functionName: "creator" },
          { address, abi: marketAbi, functionName: "liquidityRedeemed" },
          { address, abi: marketAbi, functionName: "balYes", args: [user ?? zero] },
          { address, abi: marketAbi, functionName: "balNo", args: [user ?? zero] },
        ]
      : [],
    query: { enabled: !!address, refetchInterval: REFRESH_MS },
  });

  return useMemo(() => {
    const market = address && reads ? toMarket(address, FIELDS.map((_, j) => reads[j]?.result)) : null;
    const n = FIELDS.length;
    return {
      market,
      isLoading,
      resolver: reads?.[n]?.result as `0x${string}` | undefined,
      creator: reads?.[n + 1]?.result as `0x${string}` | undefined,
      liquidityRedeemed: (reads?.[n + 2]?.result as boolean | undefined) ?? false,
      balYes: (reads?.[n + 3]?.result as bigint | undefined) ?? 0n,
      balNo: (reads?.[n + 4]?.result as bigint | undefined) ?? 0n,
    };
  }, [address, reads, isLoading]);
}

/** The connected user's YES/NO share balances across the given markets. */
export function usePositions(markets: MarketData[]) {
  const { address: user } = useAccount();

  const { data: reads, isLoading } = useReadContracts({
    contracts: user
      ? markets.flatMap((m) => [
          { address: m.address, abi: marketAbi, functionName: "balYes", args: [user] } as const,
          { address: m.address, abi: marketAbi, functionName: "balNo", args: [user] } as const,
        ])
      : [],
    query: { enabled: !!user && markets.length > 0, refetchInterval: REFRESH_MS },
  });

  const positions = useMemo(() => {
    if (!reads) return [];
    return markets.flatMap((market, i) => {
      const balYes = (reads[i * 2]?.result as bigint | undefined) ?? 0n;
      const balNo = (reads[i * 2 + 1]?.result as bigint | undefined) ?? 0n;
      const out: { market: MarketData; isYes: boolean; shares: bigint; value: number }[] = [];
      for (const [isYes, shares] of [[true, balYes], [false, balNo]] as const) {
        if (shares === 0n) continue;
        // mark value: shares × current price (1 or 0 once resolved)
        const price = market.resolved
          ? (market.outcome === 1) === isYes ? 1 : 0
          : isYes ? market.priceYes : 1 - market.priceYes;
        out.push({ market, isYes, shares, value: Number(formatUnits(shares, USDC_DECIMALS)) * price });
      }
      return out;
    });
  }, [markets, reads]);

  return { positions, isLoading };
}

export function fmtUsdc(v: bigint, digits = 2): string {
  return Number(formatUnits(v, USDC_DECIMALS)).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function cents(p: number): number {
  return Math.round(p * 100);
}
