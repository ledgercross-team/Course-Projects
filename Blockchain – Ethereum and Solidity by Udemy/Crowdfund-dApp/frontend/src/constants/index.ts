export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3') as `0x${string}`;

export const SUPPORTED_CHAINS = {
  localhost: 31337,
  sepolia: 11155111,
} as const;
