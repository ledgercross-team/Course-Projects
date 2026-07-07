import { sepolia } from "wagmi/chains";

// Filled in after `forge script Deploy` — see .env.local.example.
export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const CHAIN = sepolia;
export const USDC_DECIMALS = 6;

export const factoryAbi = [
  { type: "function", name: "allMarkets", stateMutability: "view", inputs: [], outputs: [{ type: "address[]" }] },
] as const;

export const marketAbi = [
  { type: "function", name: "question", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "closeTime", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "reserveYes", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "reserveNo", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "priceYes", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "resolved", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "outcome", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "resolver", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "creator", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "liquidityRedeemed", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  {
    type: "function",
    name: "resolve",
    stateMutability: "nonpayable",
    inputs: [{ name: "_outcome", type: "uint8" }],
    outputs: [],
  },
  {
    type: "function",
    name: "redeemLiquidity",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balYes",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balNo",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "calcBuyShares",
    stateMutability: "view",
    inputs: [
      { name: "isYes", type: "bool" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "buy",
    stateMutability: "nonpayable",
    inputs: [
      { name: "isYes", type: "bool" },
      { name: "amountIn", type: "uint256" },
      { name: "minSharesOut", type: "uint256" },
    ],
    outputs: [{ type: "uint256" }],
  },
  { type: "function", name: "redeem", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [{ type: "address" }, { type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const;
