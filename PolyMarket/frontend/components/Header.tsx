"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { parseUnits } from "viem";
import { USDC_ADDRESS, USDC_DECIMALS, erc20Abi } from "@/lib/contracts";
import { fmtUsdc } from "@/lib/markets";
import { IconPolymarket, IconWallet } from "@/components/ui/icons";

const NAV = [
  { href: "/", label: "Markets" },
  { href: "/portfolio", label: "Portfolio" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4 sm:px-5">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-white">
          <IconPolymarket />
          <span className="hidden text-[19px] font-bold tracking-tight sm:block">Predict</span>
        </Link>

        <nav className="ml-2 flex items-center gap-0.5">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                pathname === n.href ? "bg-cardhover text-textbright" : "text-muted hover:text-text"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2.5">
          <WalletBar />
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" label="Connect" />
        </div>
      </div>
    </header>
  );
}

/** mUSDC balance + open faucet, shown once a wallet is connected. */
function WalletBar() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const { data: balance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) queryClient.invalidateQueries();
  }, [isSuccess, queryClient]);

  if (!address) return null;
  const busy = isPending || confirming;

  return (
    <>
      <span className="tnum hidden items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-text sm:flex">
        <IconWallet width={15} height={15} className="text-muted" />
        {balance !== undefined ? fmtUsdc(balance) : "—"} mUSDC
      </span>
      <button
        onClick={() =>
          writeContract({
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: "mint",
            args: [address, parseUnits("1000", USDC_DECIMALS)],
          })
        }
        disabled={busy}
        className="rounded-lg bg-blue px-3.5 py-2 text-sm font-semibold text-white shadow-glow transition-all hover:bg-blue-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Minting…" : "+ Faucet"}
      </button>
    </>
  );
}
