import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, foundry } from "wagmi/chains";
import { http } from "wagmi";

// Free WalletConnect project id from https://reown.com (formerly WalletConnect Cloud).
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "demo";

// Local anvil (chain 31337) for dev, Sepolia for testnet. Wallet can pick either.
export const config = getDefaultConfig({
  appName: "Predict",
  projectId,
  chains: [foundry, sepolia],
  transports: {
    [foundry.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
  },
  ssr: true,
});
