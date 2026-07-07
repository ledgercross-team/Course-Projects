"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseUnits, formatUnits, type BaseError } from "viem";
import { marketAbi, erc20Abi, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/contracts";
import { cents, fmtUsdc, type MarketData } from "@/lib/markets";

type Side = "yes" | "no";

export type TradePanelProps = {
  market: MarketData;
  resolver?: `0x${string}`;
  creator?: `0x${string}`;
  liquidityRedeemed: boolean;
  balYes: bigint;
  balNo: bigint;
};

/** One write + receipt-tracking + refetch-everything-on-confirm. */
function useTx() {
  const queryClient = useQueryClient();
  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useEffect(() => {
    if (isSuccess) queryClient.invalidateQueries();
  }, [isSuccess, queryClient]);
  return { writeContract, busy: isPending || confirming, error: error as BaseError | null, reset };
}

export function TradePanel(props: TradePanelProps) {
  const { market } = props;
  const closed = useClosed(market.closeTime);

  if (market.resolved) return <SettledPanel {...props} />;
  if (closed) return <AwaitingPanel {...props} />;
  return <BuyPanel market={market} />;
}

/** True once wall clock passes closeTime — with a timer so the panel flips without a reload. */
function useClosed(closeTime: number): boolean {
  const [closed, setClosed] = useState(() => Date.now() / 1000 >= closeTime);
  useEffect(() => {
    const ms = closeTime * 1000 - Date.now();
    if (ms <= 0) {
      setClosed(true);
      return;
    }
    // setTimeout overflows past ~24.8 days; markets that far out can't close during one mount anyway
    if (ms > 2 ** 31 - 1) return;
    const t = setTimeout(() => setClosed(true), ms + 500);
    return () => clearTimeout(t);
  }, [closeTime]);
  return closed;
}

function BuyPanel({ market }: { market: MarketData }) {
  const { address } = useAccount();
  const [side, setSide] = useState<Side>("yes");
  const [amount, setAmount] = useState("");
  const tx = useTx();

  const amountWei = safeParse(amount);
  const isYes = side === "yes";
  const price = isYes ? market.priceYes : 1 - market.priceYes;

  const { data: quote } = useReadContract({
    address: market.address,
    abi: marketAbi,
    functionName: "calcBuyShares",
    args: [isYes, amountWei],
    query: { enabled: amountWei > 0n },
  });

  const { data: allowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "allowance",
    args: address ? [address, market.address] : undefined,
    query: { enabled: !!address },
  });

  const { data: usdcBal } = useReadContract({
    address: USDC_ADDRESS,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const needsApproval = (allowance ?? 0n) < amountWei;
  const insufficient = usdcBal !== undefined && amountWei > usdcBal;

  function submit() {
    if (needsApproval) {
      tx.writeContract({ address: USDC_ADDRESS, abi: erc20Abi, functionName: "approve", args: [market.address, amountWei] });
    } else {
      const minOut = quote ? (quote * 98n) / 100n : 0n; // 2% slippage guard
      tx.writeContract({ address: market.address, abi: marketAbi, functionName: "buy", args: [isYes, amountWei, minOut] });
      setAmount("");
    }
  }

  return (
    <Panel>
      <div className="grid grid-cols-2 gap-2.5">
        {(["yes", "no"] as const).map((s) => {
          const active = side === s;
          const activeCls =
            s === "yes"
              ? "bg-yes text-white shadow-[0_4px_16px_rgba(61,180,104,0.3)]"
              : "bg-no text-white shadow-[0_4px_16px_rgba(230,72,72,0.3)]";
          return (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-3 text-[15px] font-bold transition-all active:scale-[0.98] ${
                active ? activeCls : "bg-cardhover text-subtle hover:bg-elevate"
              }`}
            >
              {s === "yes" ? "Yes" : "No"}
              <span className="tnum">{cents(s === "yes" ? market.priceYes : 1 - market.priceYes)}¢</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm font-medium text-muted">Amount</span>
        <div className={`tnum inline-flex items-center text-[28px] font-bold ${amountWei > 0n ? "text-textbright" : "text-faint"}`}>
          <span>$</span>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0"
            style={{ width: `${Math.max(1, amount.length) + 0.4}ch` }}
            className="bg-transparent text-left outline-none placeholder:text-faint"
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2">
        {[1, 5, 10, 100].map((q) => (
          <button
            key={q}
            onClick={() => setAmount(String((Number(amount) || 0) + q))}
            className="tnum rounded-lg bg-cardhover px-3 py-1.5 text-xs font-semibold text-subtle transition-colors hover:bg-elevate hover:text-text"
          >
            +${q}
          </button>
        ))}
        <button
          onClick={() => usdcBal !== undefined && setAmount(formatUnits(usdcBal, USDC_DECIMALS))}
          className="rounded-lg bg-cardhover px-3 py-1.5 text-xs font-semibold text-subtle transition-colors hover:bg-elevate hover:text-text"
        >
          Max
        </button>
      </div>

      {quote !== undefined && amountWei > 0n && (
        <div className="animate-fadeIn mt-4 space-y-1.5 rounded-xl bg-surface p-3 text-sm">
          <Row label="Avg price" value={`${cents(price)}¢`} />
          <Row label="Shares" value={fmtUsdc(quote)} />
          <div className="flex items-center justify-between">
            <span className="text-muted">Payout if {isYes ? "Yes" : "No"} wins</span>
            <span className="tnum font-semibold text-yes-text">${fmtUsdc(quote)}</span>
          </div>
        </div>
      )}

      <div className="mt-4">
        {!address ? (
          <p className="rounded-xl border border-border bg-surface py-3 text-center text-sm text-muted">
            Connect your wallet to trade
          </p>
        ) : (
          <ActionButton
            onClick={submit}
            busy={tx.busy}
            disabled={amountWei === 0n || insufficient}
            tone={needsApproval ? undefined : side}
          >
            {tx.busy
              ? "Confirming…"
              : insufficient
                ? "Insufficient mUSDC — use the faucet"
                : amountWei === 0n
                  ? "Enter an amount"
                  : needsApproval
                    ? "Approve mUSDC"
                    : `Buy ${isYes ? "Yes" : "No"} · $${amount}`}
          </ActionButton>
        )}
      </div>

      <TxError error={tx.error} />
    </Panel>
  );
}

/** Market closed, not yet resolved. The resolver sees report buttons. */
function AwaitingPanel({ market, resolver }: TradePanelProps) {
  const { address } = useAccount();
  const tx = useTx();
  const isResolver = !!address && !!resolver && address.toLowerCase() === resolver.toLowerCase();

  return (
    <Panel>
      <p className="text-center text-sm text-muted">Trading is closed.</p>
      <p className="mt-1 text-center text-base font-semibold text-text">Awaiting resolution</p>
      {isResolver && (
        <div className="mt-4">
          <p className="mb-2 text-center text-xs uppercase tracking-wide text-faint">You are the resolver — report the outcome</p>
          <div className="grid grid-cols-2 gap-2.5">
            <ActionButton tone="yes" busy={tx.busy} onClick={() => tx.writeContract({ address: market.address, abi: marketAbi, functionName: "resolve", args: [1] })}>
              Resolve YES
            </ActionButton>
            <ActionButton tone="no" busy={tx.busy} onClick={() => tx.writeContract({ address: market.address, abi: marketAbi, functionName: "resolve", args: [2] })}>
              Resolve NO
            </ActionButton>
          </div>
          <TxError error={tx.error} />
        </div>
      )}
    </Panel>
  );
}

/** Resolved: redeem winning shares; the creator can also withdraw the pool's winning reserve. */
function SettledPanel({ market, creator, liquidityRedeemed, balYes, balNo }: TradePanelProps) {
  const { address } = useAccount();
  const tx = useTx();
  const yesWon = market.outcome === 1;
  const winning = yesWon ? balYes : balNo;
  const isCreator = !!address && !!creator && address.toLowerCase() === creator.toLowerCase();

  return (
    <Panel>
      <p className="text-center text-sm text-muted">This market has resolved</p>
      <p className={`mt-1 text-center text-2xl font-bold ${yesWon ? "text-yes-text" : "text-no-text"}`}>
        {yesWon ? "YES" : "NO"}
      </p>

      <div className="mt-4">
        {!address ? (
          <p className="rounded-xl border border-border bg-surface py-3 text-center text-sm text-muted">
            Connect your wallet to redeem
          </p>
        ) : winning > 0n ? (
          <ActionButton
            tone={yesWon ? "yes" : "no"}
            busy={tx.busy}
            onClick={() => tx.writeContract({ address: market.address, abi: marketAbi, functionName: "redeem", args: [] })}
          >
            Redeem {fmtUsdc(winning)} mUSDC
          </ActionButton>
        ) : (
          <p className="rounded-xl border border-border bg-surface py-3 text-center text-sm text-muted">
            No winning shares to redeem
          </p>
        )}
      </div>

      {isCreator && !liquidityRedeemed && (
        <div className="mt-2.5">
          <ActionButton busy={tx.busy} onClick={() => tx.writeContract({ address: market.address, abi: marketAbi, functionName: "redeemLiquidity", args: [] })}>
            Withdraw liquidity ({fmtUsdc(yesWon ? market.reserveYes : market.reserveNo)} mUSDC)
          </ActionButton>
        </div>
      )}

      <TxError error={tx.error} />
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-border bg-card p-4 shadow-widget">{children}</div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="tnum font-medium text-text">{value}</span>
    </div>
  );
}

function ActionButton({
  onClick,
  busy,
  disabled,
  tone,
  children,
}: {
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: Side;
  children: React.ReactNode;
}) {
  const bg = tone === "no" ? "bg-no hover:bg-no-strong" : tone === "yes" ? "bg-yes hover:bg-yes-strong" : "bg-blue hover:bg-blue-hover";
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`w-full rounded-xl py-3 text-[15px] font-bold text-white transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${bg}`}
    >
      {children}
    </button>
  );
}

function TxError({ error }: { error: BaseError | null }) {
  if (!error) return null;
  return (
    <p className="mt-3 rounded-lg bg-no-soft px-3 py-2 text-xs font-medium text-no-text">
      {error.shortMessage ?? error.message}
    </p>
  );
}

function safeParse(v: string): bigint {
  try {
    return parseUnits(v || "0", USDC_DECIMALS);
  } catch {
    return 0n;
  }
}
