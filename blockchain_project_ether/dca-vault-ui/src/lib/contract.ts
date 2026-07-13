import { publicClient, getWalletClient, ensureChain } from './viem'
import { abi, usdcAbi } from './abi'

export const VAULT = import.meta.env.VITE_VAULT_ADDRESS as `0x${string}`
export const USDC = import.meta.env.VITE_USDC_ADDRESS as `0x${string}`

const TX_TIMEOUT_MS = 120_000

async function getAccount(): Promise<`0x${string}`> {
  const accounts = await window.ethereum!.request({ method: 'eth_accounts' }) as string[]
  if (!accounts[0]) throw new Error('Wallet not connected')
  return accounts[0] as `0x${string}`
}

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out — check MetaMask for a pending request`)), TX_TIMEOUT_MS),
    ),
  ])
}

export async function read(method: string, args: readonly unknown[] = []) {
  return publicClient.readContract({ address: VAULT, abi, functionName: method as any, args: args as any })
}

export async function write(method: string, args: readonly unknown[] = []) {
  await ensureChain()
  const account = await getAccount()
  const walletClient = getWalletClient(account)
  const hash = await withTimeout(
    walletClient.writeContract({ address: VAULT, abi, functionName: method as any, args: args as any }),
    'Transaction',
  )
  return publicClient.waitForTransactionReceipt({ hash })
}

export async function checkAllowance(owner: `0x${string}`) {
  return publicClient.readContract({ address: USDC, abi: usdcAbi, functionName: 'allowance', args: [owner, VAULT] })
}

export async function approveUSDC(amount: bigint) {
  await ensureChain()
  const account = await getAccount()
  const walletClient = getWalletClient(account)
  const hash = await withTimeout(
    walletClient.writeContract({ address: USDC, abi: usdcAbi, functionName: 'approve', args: [VAULT, amount] }),
    'USDC approval',
  )
  return publicClient.waitForTransactionReceipt({ hash })
}

export async function getUSDCBalance(owner: `0x${string}`) {
  return publicClient.readContract({ address: USDC, abi: usdcAbi, functionName: 'balanceOf', args: [owner] }) as Promise<bigint>
}

export async function getHistory(fromBlock: bigint = 0n) {
  return publicClient.getContractEvents({
    address: VAULT,
    abi,
    eventName: 'DCAExecuted',
    fromBlock,
    toBlock: 'latest',
  })
}
