export const abi = [
  { type: "function", name: "deposit", inputs: [{ name: "amount", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdraw", inputs: [{ name: "sharesToBurn", type: "uint256" }], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "withdrawETH", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "executeDCA", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "getUserUSDCBalance", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "getUserETHEarned", inputs: [{ name: "user", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalUSDCDeposited", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalETHAccumulated", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "totalShares", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "userShares", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "userETHCompensated", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "paused", inputs: [], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "dcaIntervalBlocks", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "dcaPercentage", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "slippageBps", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "owner", inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "lastDCABlock", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "event", name: "DCAExecuted", inputs: [
    { name: "swapAmount", type: "uint256", indexed: false },
    { name: "ethReceived", type: "uint256", indexed: false },
    { name: "blockNumber", type: "uint256", indexed: false }
  ], anonymous: false },
  { type: "event", name: "Deposited", inputs: [
    { name: "user", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
    { name: "shares", type: "uint256", indexed: false }
  ], anonymous: false },
  { type: "event", name: "Withdrawn", inputs: [
    { name: "user", type: "address", indexed: true },
    { name: "amount", type: "uint256", indexed: false },
    { name: "shares", type: "uint256", indexed: false }
  ], anonymous: false },
  { type: "event", name: "ETHWithdrawn", inputs: [
    { name: "user", type: "address", indexed: true },
    { name: "ethAmount", type: "uint256", indexed: false }
  ], anonymous: false },
] as const

export const usdcAbi = [
  { type: "function", name: "allowance", inputs: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" }
  ], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve", inputs: [
    { name: "spender", type: "address" },
    { name: "amount", type: "uint256" }
  ], outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable" },
  { type: "function", name: "balanceOf", inputs: [
    { name: "account", type: "address" }
  ], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
] as const
