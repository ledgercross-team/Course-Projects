import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2, Info, Zap, ArrowDownToLine, ArrowUpFromLine, Coins, TrendingUp } from 'lucide-react'
import { Sparkline } from '@/components/ui/sparkline'
import { Particles } from '@/components/ui/particles'
import { MagicCard } from '@/components/ui/magic-card'
import { BorderBeam } from '@/components/ui/border-beam'
import { ShineBorder } from '@/components/ui/shine-border'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { connectWallet, getETHBalance, activeChain } from '@/lib/viem'
import { read, write, approveUSDC, checkAllowance, getHistory, getUSDCBalance } from '@/lib/contract'
import { useToast } from '@/lib/use-toast'
import { ToastContainer } from '@/components/toast-container'
import { shortenAddress, type EvmAddress } from '@/lib/wallet'

function usePrefersReducedMotion() {
  const [prefersReduced, setPrefersReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return prefersReduced
}

// ============================================================
// Types
// ============================================================

interface VaultState {
  totalUSDC: bigint
  totalETH: bigint
  paused: boolean
  interval: bigint
  percentage: bigint
}

interface UserState {
  shares: bigint
  usdcValue: bigint
  ethValue: bigint
}

interface HistoryEvent {
  args: { swapAmount: bigint; ethReceived: bigint; blockNumber: bigint }
}

// ============================================================
// Formatting
// ============================================================

const numFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const ethFmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })

function formatUSDC(amount: bigint) {
  return numFmt.format(Number(amount) / 1_000_000)
}

function formatETH(amount: bigint) {
  return ethFmt.format(Number(amount) / 1e18)
}

function friendlyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error)
  if (msg.includes('ACTION_REJECTED') || msg.includes('User denied')) return 'Transaction cancelled'
  if (msg.includes('timed out')) return msg
  if (msg.includes('Insufficient USDC')) return msg
  if (msg.includes('Insufficient ETH')) return msg
  if (msg.includes('execution reverted')) {
    if (msg.includes('interval not reached')) return 'DCA interval not reached — wait for more blocks'
    if (msg.includes('swap amount is 0')) return 'No USDC in vault to swap — deposit first'
    return 'Transaction reverted'
  }
  if (msg.includes('EnforcedPause')) return 'Vault is paused'
  return msg.length > 120 ? msg.slice(0, 120) + '...' : msg
}

// ============================================================
// Shared card wrapper — consistent spacing everywhere
// ============================================================

function SectionCard({ children, className = '', beam = false }: { children: React.ReactNode; className?: string; beam?: boolean }) {
  return (
    <MagicCard
      gradientFrom="#9E7AFF"
      gradientTo="#FE8BBB"
      className={className}
    >
      <div className="p-6">{children}</div>
      {beam && <BorderBeam size={120} duration={8} colorFrom="#9E7AFF" colorTo="#FE8BBB" />}
    </MagicCard>
  )
}

// ============================================================
// App
// ============================================================

type TxAction = 'deposit' | 'withdraw' | 'withdrawEth' | 'executeDca' | null

export default function App() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const [account, setAccount] = useState<EvmAddress | null>(null)
  const [vault, setVault] = useState<VaultState>({ totalUSDC: 0n, totalETH: 0n, paused: false, interval: 0n, percentage: 0n })
  const [user, setUser] = useState<UserState>({ shares: 0n, usdcValue: 0n, ethValue: 0n })
  const [history, setHistory] = useState<HistoryEvent[]>([])
  const [walletUSDC, setWalletUSDC] = useState<bigint | null>(null)
  const [walletETH, setWalletETH] = useState<bigint | null>(null)
  const [vaultHistory, setVaultHistory] = useState<{ totalUSDC: number[]; totalETH: number[] }>({ totalUSDC: [], totalETH: [] })
  const [userHistory, setUserHistory] = useState<{ usdcValue: number[]; ethValue: number[] }>({ usdcValue: [], ethValue: [] })
  const [loadingVault, setLoadingVault] = useState(true)
  const [loadingTx, setLoadingTx] = useState(false)
  const [activeAction, setActiveAction] = useState<TxAction>(null)
  const [txLabel, setTxLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { toasts, toast, dismiss } = useToast()
  const depositRef = useRef<HTMLInputElement>(null)
  const withdrawRef = useRef<HTMLInputElement>(null)

  // Data refresh
  const refreshVault = useCallback(async () => {
    try {
      const [totalUSDC, totalETH, paused, interval, percentage] = await Promise.all([
        read('totalUSDCDeposited') as Promise<bigint>,
        read('totalETHAccumulated') as Promise<bigint>,
        read('paused') as Promise<boolean>,
        read('dcaIntervalBlocks') as Promise<bigint>,
        read('dcaPercentage') as Promise<bigint>,
      ])
      setVault({ totalUSDC, totalETH, paused, interval, percentage })
      setVaultHistory(prev => ({
        totalUSDC: [...prev.totalUSDC, Number(totalUSDC)].slice(-30),
        totalETH: [...prev.totalETH, Number(totalETH)].slice(-30),
      }))
    } finally {
      setLoadingVault(false)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    if (!account) return
    try {
      const [shares, usdcValue, ethValue, walletBalance, ethBalance] = await Promise.all([
        read('userShares', [account]) as Promise<bigint>,
        read('getUserUSDCBalance', [account]) as Promise<bigint>,
        read('getUserETHEarned', [account]) as Promise<bigint>,
        getUSDCBalance(account),
        getETHBalance(account),
      ])
      setUser({ shares, usdcValue, ethValue })
      setUserHistory(prev => ({
        usdcValue: [...prev.usdcValue, Number(usdcValue)].slice(-30),
        ethValue: [...prev.ethValue, Number(ethValue)].slice(-30),
      }))
      setWalletUSDC(walletBalance)
      setWalletETH(ethBalance)
    } catch { /* user may not have deposits */ }
  }, [account])

  const refreshHistory = useCallback(async () => {
    try {
      const events = await getHistory(0n)
      setHistory((events as unknown as HistoryEvent[]).reverse().slice(0, 20))
    } catch { /* no events yet */ }
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshVault(), refreshUser(), refreshHistory()])
  }, [refreshVault, refreshUser, refreshHistory])

  // Init
  useEffect(() => {
    ;(async () => {
      try {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' }) as string[]
          if (accounts[0]) setAccount(accounts[0] as EvmAddress)
        }
      } catch {}
      setLoadingVault(false)
    })()
  }, [])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  useEffect(() => {
    const interval = setInterval(refreshAll, 15_000)
    return () => clearInterval(interval)
  }, [refreshAll])

  // Actions
  const handleConnect = async () => {
    try {
      const addr = await connectWallet()
      setAccount(addr)
      toast('Wallet connected', 'success')
    } catch (e) {
      setError(friendlyError(e))
      toast(friendlyError(e), 'error')
    }
  }

  const handleDisconnect = () => {
    setAccount(null)
    setUser({ shares: 0n, usdcValue: 0n, ethValue: 0n })
    setUserHistory({ usdcValue: [], ethValue: [] })
    setWalletUSDC(null)
    setWalletETH(null)
  }

  const handleDeposit = async () => {
    const input = depositRef.current
    if (!input) return
    const amount = BigInt(Math.floor(parseFloat(input.value) * 1_000_000))
    if (amount <= 0n) return

    setLoadingTx(true)
    setActiveAction('deposit')
    setError(null)
    setTxLabel('Checking')
    try {
      if (!account) throw new Error('Wallet not connected')

      const [ethBalance, usdcBalance] = await Promise.all([
        getETHBalance(account),
        getUSDCBalance(account),
      ])
      if (ethBalance === 0n) throw new Error('Insufficient ETH for gas — fund your wallet on Sepolia')
      if (usdcBalance < amount) throw new Error(`Insufficient USDC (have $${formatUSDC(usdcBalance)}, need $${formatUSDC(amount)})`)

      const allowance = await checkAllowance(account)
      if (allowance < amount) {
        toast('Approving USDC...', 'info')
        setTxLabel('Approving')
        await approveUSDC(amount)
        toast('USDC approved', 'success')
      }
      toast('Depositing...', 'info')
      setTxLabel('Depositing')
      await write('deposit', [amount])
      toast('Deposited!', 'success')
      input.value = ''
      await refreshAll()
    } catch (e) {
      const msg = friendlyError(e)
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoadingTx(false)
      setActiveAction(null)
      setTxLabel(null)
    }
  }

  const handleDepositMax = () => {
    if (depositRef.current && walletUSDC !== null) {
      depositRef.current.value = formatUSDC(walletUSDC)
    }
  }

  const handleWithdrawMax = () => {
    if (withdrawRef.current) {
      withdrawRef.current.value = user.shares.toString()
    }
  }

  const handleWithdraw = async () => {
    const input = withdrawRef.current
    if (!input) return
    const shares = BigInt(Math.floor(parseFloat(input.value)))
    if (shares <= 0n) return

    setLoadingTx(true)
    setActiveAction('withdraw')
    setError(null)
    setTxLabel('Withdrawing')
    try {
      toast('Withdrawing...', 'info')
      await write('withdraw', [shares])
      toast('Withdrawn!', 'success')
      input.value = ''
      await refreshAll()
    } catch (e) {
      const msg = friendlyError(e)
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoadingTx(false)
      setActiveAction(null)
      setTxLabel(null)
    }
  }

  const handleWithdrawETH = async () => {
    setLoadingTx(true)
    setActiveAction('withdrawEth')
    setError(null)
    setTxLabel('Withdrawing ETH')
    try {
      toast('Withdrawing ETH...', 'info')
      await write('withdrawETH', [])
      toast('ETH withdrawn!', 'success')
      await refreshAll()
    } catch (e) {
      const msg = friendlyError(e)
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoadingTx(false)
      setActiveAction(null)
      setTxLabel(null)
    }
  }

  const handleExecuteDCA = async () => {
    setLoadingTx(true)
    setActiveAction('executeDca')
    setError(null)
    setTxLabel('Executing DCA')
    try {
      toast('Executing DCA...', 'info')
      await write('executeDCA', [])
      toast('DCA executed!', 'success')
      await refreshAll()
    } catch (e) {
      const msg = friendlyError(e)
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoadingTx(false)
      setActiveAction(null)
      setTxLabel(null)
    }
  }

  const btnLabel = (action: TxAction, idle: string) => {
    if (loadingTx && activeAction === action) return txLabel ?? '...'
    return idle
  }

  const etherscanUrl = import.meta.env.VITE_ETHERSCAN_URL

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background — particles that react to mouse */}
      <div className="fixed inset-0 pointer-events-none">
        {!prefersReducedMotion && (
          <Particles
            className="absolute inset-0 h-full w-full"
            quantity={80}
            color="#8B5CF6"
            size={0.6}
            staticity={30}
            ease={70}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 md:px-6 py-6 flex flex-col gap-6">
        <ToastContainer toasts={toasts} onDismiss={dismiss} />

        {/* Header */}
        <header className="relative flex items-center justify-between py-3 px-5 rounded-xl bg-card/60 backdrop-blur-md border border-border/40">
          <ShineBorder shineColor={["#9E7AFF", "#FE8BBB", "#9E7AFF"]} borderWidth={1} duration={6} />
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              <Zap className="size-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">DCA Vault</h1>
              <p className="text-xs text-muted-foreground">Dollar Cost Averaging</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-medium">{activeChain.name}</Badge>
            {account ? (
              <Button variant="outline" onClick={handleDisconnect} className="font-mono text-xs">
                {shortenAddress(account)}
              </Button>
            ) : (
              <Button onClick={handleConnect} className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20">
                Connect Wallet
              </Button>
            )}
          </div>
        </header>

        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Vault Dashboard */}
        <section aria-labelledby="dashboard-heading">
          {loadingVault ? (
            <SectionCard>
              <div className="flex flex-col gap-4">
                <Skeleton className="h-6 w-32" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Array(4).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-xl" />
                  ))}
                </div>
              </div>
            </SectionCard>
          ) : (
            <SectionCard beam>
              <div className="flex items-center justify-between mb-4">
                <h2 id="dashboard-heading" className="text-lg font-semibold">Vault Overview</h2>
                <Badge variant={vault.paused ? 'destructive' : 'default'} className="font-medium">
                  {vault.paused ? 'Paused' : 'Active'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<Coins className="size-4 text-emerald-400" />} label="Total USDC" value={`$${formatUSDC(vault.totalUSDC)}`} accent="emerald" sparklineData={vaultHistory.totalUSDC} />
                <StatCard icon={<TrendingUp className="size-4 text-blue-400" />} label="Total ETH" value={formatETH(vault.totalETH)} accent="blue" sparklineData={vaultHistory.totalETH} />
                <StatCard label="Interval" value={`${vault.interval}`} suffix="blocks" tip="Blocks between automatic DCA swaps" />
                <StatCard label="Swap Rate" value={`${(Number(vault.percentage) / 100).toFixed(2)}%`} tip="Percentage of deposited USDC swapped each interval" />
              </div>
            </SectionCard>
          )}
        </section>

        {/* User Position */}
        {account && (
          <section aria-labelledby="position-heading">
            <SectionCard>
              <h2 id="position-heading" className="text-lg font-semibold mb-4">Your Position</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard icon={<div className="size-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-600" />} label="Wallet ETH" value={walletETH !== null ? formatETH(walletETH) : '—'} />
                <StatCard icon={<div className="size-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" />} label="Wallet USDC" value={walletUSDC !== null ? `$${formatUSDC(walletUSDC)}` : '—'} />
                <StatCard icon={<Coins className="size-4 text-emerald-400" />} label="USDC Value" value={`$${formatUSDC(user.usdcValue)}`} accent="emerald" sparklineData={userHistory.usdcValue} />
                <StatCard icon={<TrendingUp className="size-4 text-blue-400" />} label="ETH Earned" value={formatETH(user.ethValue)} accent="blue" sparklineData={userHistory.ethValue} />
                <StatCard label="Shares" value={user.shares.toLocaleString()} tip="Your share of the vault pool" />
              </div>
            </SectionCard>
          </section>
        )}

        {/* Actions */}
        {account && (
          <section aria-labelledby="actions-heading">
            <SectionCard>
              <h2 id="actions-heading" className="text-lg font-semibold mb-4">Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left column — Deposit */}
                <div className="flex flex-col gap-3">
                  <form className="flex flex-col gap-2" onSubmit={e => { e.preventDefault(); handleDeposit() }}>
                    <label className="text-xs font-medium tracking-wide text-muted-foreground flex items-center gap-1.5" htmlFor="deposit-amount">
                      <ArrowDownToLine className="size-3" />
                      Deposit USDC
                    </label>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Balance: {walletUSDC !== null ? formatUSDC(walletUSDC) : '—'} USDC</span>
                      <button type="button" onClick={handleDepositMax} className="text-primary hover:underline cursor-pointer font-medium">Max</button>
                    </div>
                    <div className="flex gap-2">
                      <Input id="deposit-amount" ref={depositRef} type="number" placeholder="0.00" min="0" step="any" className="bg-muted/30 flex-1" />
                      <Button type="submit" disabled={loadingTx} className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white" aria-label={btnLabel('deposit', 'Deposit')}>
                        {loadingTx && activeAction === 'deposit' && <Loader2 className="animate-spin mr-1.5 size-4" />}
                        {btnLabel('deposit', 'Deposit')}
                      </Button>
                    </div>
                  </form>
                  <Button variant="outline" onClick={handleWithdrawETH} disabled={loadingTx} className="w-full border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400" aria-label={btnLabel('withdrawEth', 'Withdraw ETH')}>
                    {loadingTx && activeAction === 'withdrawEth' && <Loader2 className="animate-spin mr-1.5 size-4" />}
                    {btnLabel('withdrawEth', 'Withdraw ETH')}
                  </Button>
                </div>

                {/* Right column — Withdraw */}
                <div className="flex flex-col gap-3">
                  <form className="flex flex-col gap-2" onSubmit={e => { e.preventDefault(); handleWithdraw() }}>
                    <label className="text-xs font-medium tracking-wide text-muted-foreground flex items-center gap-1.5" htmlFor="withdraw-amount">
                      <ArrowUpFromLine className="size-3" />
                      Withdraw Shares
                    </label>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Balance: {user.shares.toLocaleString()} shares</span>
                      <button type="button" onClick={handleWithdrawMax} className="text-primary hover:underline cursor-pointer font-medium">Max</button>
                    </div>
                    <div className="flex gap-2">
                      <Input id="withdraw-amount" ref={withdrawRef} type="number" placeholder="0" min="0" step="any" className="bg-muted/30 flex-1" />
                      <Button type="submit" variant="destructive" disabled={loadingTx} aria-label={btnLabel('withdraw', 'Withdraw')}>
                        {loadingTx && activeAction === 'withdraw' && <Loader2 className="animate-spin mr-1.5 size-4" />}
                        {btnLabel('withdraw', 'Withdraw')}
                      </Button>
                    </div>
                  </form>
                  <Button variant="default" onClick={handleExecuteDCA} disabled={vault.paused || loadingTx} className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20" aria-label={btnLabel('executeDca', 'Execute DCA')}>
                    {loadingTx && activeAction === 'executeDca' && <Loader2 className="animate-spin mr-1.5 size-4" />}
                    {btnLabel('executeDca', vault.paused ? 'Paused' : 'Execute DCA')}
                  </Button>
                </div>
              </div>
              {error && (
                <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive" role="alert">
                  {error}
                </div>
              )}
            </SectionCard>
          </section>
        )}

        {/* DCA History */}
        <section aria-labelledby="history-heading">
          <SectionCard>
            <h2 id="history-heading" className="text-lg font-semibold mb-4">DCA History</h2>
            {history.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="size-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No swaps executed yet. Execute DCA to start converting USDC to ETH.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead className="text-muted-foreground">Block</TableHead>
                    <TableHead className="text-right text-muted-foreground">USDC Swapped</TableHead>
                    <TableHead className="text-right text-muted-foreground">ETH Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((e, i) => (
                    <TableRow key={i} className="border-border/30 hover:bg-muted/30">
                      <TableCell>
                        <a
                          href={`${etherscanUrl}/block/${e.args.blockNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-4 hover:underline font-mono text-xs"
                        >
                          #{e.args.blockNumber.toString()}
                        </a>
                      </TableCell>
                      <TableCell className="text-right font-mono">${formatUSDC(e.args.swapAmount)}</TableCell>
                      <TableCell className="text-right font-mono text-blue-400">{formatETH(e.args.ethReceived)} ETH</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </section>

        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

        <footer className="text-center text-xs text-muted-foreground pb-4">
          DCA Vault — Dollar Cost Averaging on {activeChain.name}
        </footer>
      </div>
    </main>
  )
}

function StatCard({ icon, label, value, suffix, tip, accent, sparklineData }: { icon?: React.ReactNode; label: string; value: string; suffix?: string; tip?: string; accent?: 'emerald' | 'blue'; sparklineData?: number[] }) {
  const accentColors = {
    emerald: 'from-emerald-400/20 to-emerald-600/5',
    blue: 'from-blue-400/20 to-blue-600/5',
  }

  return (
    <div className={`relative rounded-xl p-4 bg-gradient-to-br ${accent ? accentColors[accent] : 'from-muted/50 to-muted/20'} border border-border/30`}>
      <div className="text-xs font-medium tracking-wide text-muted-foreground flex items-center gap-1.5 mb-2">
        {icon}
        {label}
        {tip && <span title={tip} className="cursor-help opacity-50"><Info className="size-3" /></span>}
      </div>
      <div className="text-xl font-bold tracking-tight">
        {value}
        {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
      </div>
      {sparklineData && <Sparkline data={sparklineData} className="text-muted-foreground/30 mt-1" />}
    </div>
  )
}
