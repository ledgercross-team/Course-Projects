import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, sepolia, hardhat } from 'wagmi/chains';
import { http } from 'wagmi';

const chains = [
  ...(process.env.NODE_ENV === 'development' ? [hardhat] : []),
  mainnet,
  sepolia,
  ...(process.env.NODE_ENV === 'development' ? [] : [hardhat]),
] as const;

export const config = getDefaultConfig({
  appName: 'Crowdfund dApp',
  projectId: process.env.NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains,
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});
