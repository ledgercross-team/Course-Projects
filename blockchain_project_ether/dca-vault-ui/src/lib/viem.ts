import { createPublicClient, createWalletClient, http, custom, defineChain } from 'viem'
import { sepolia } from 'viem/chains'

const RPC_URL = import.meta.env.VITE_RPC_URL
const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || sepolia.id)

export const activeChain = CHAIN_ID === sepolia.id
  ? sepolia
  : defineChain({
      id: CHAIN_ID,
      name: import.meta.env.VITE_CHAIN_NAME || `Chain ${CHAIN_ID}`,
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [RPC_URL] } },
    })

const chainHex = `0x${CHAIN_ID.toString(16)}` as `0x${string}`

export const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(RPC_URL),
})

export function getWalletClient(account: `0x${string}`) {
  return createWalletClient({
    account,
    chain: activeChain,
    transport: custom(window.ethereum!),
  })
}

export async function getETHBalance(address: `0x${string}`) {
  return publicClient.getBalance({ address })
}

export async function ensureChain(): Promise<void> {
  if (!window.ethereum) throw new Error('No wallet found')

  const current = await window.ethereum.request({ method: 'eth_chainId' }) as string
  if (current.toLowerCase() === chainHex.toLowerCase()) return

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainHex }],
    })
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string }
    const needsAdd =
      e?.code === 4902 ||
      e?.code === -32603 ||
      (e?.message ?? '').toLowerCase().includes('unrecognized chain')

    if (needsAdd && CHAIN_ID !== sepolia.id) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: chainHex,
          chainName: activeChain.name,
          nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
          rpcUrls: [RPC_URL],
        }],
      })
    } else {
      throw new Error(`Please switch MetaMask to ${activeChain.name} (chain ${CHAIN_ID})`)
    }
  }
}

export async function connectWallet(): Promise<`0x${string}`> {
  if (!window.ethereum) throw new Error('No wallet found')

  await ensureChain()
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' }) as string[]
  if (!accounts[0]) throw new Error('Wallet not connected')
  return accounts[0] as `0x${string}`
}
