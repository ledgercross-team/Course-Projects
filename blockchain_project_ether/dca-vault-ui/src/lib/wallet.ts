export type EvmAddress = `0x${string}`

export function shortenAddress(addr: EvmAddress | string): string {
  if (!addr) return ''
  return addr.slice(0, 6) + '...' + addr.slice(-4)
}
