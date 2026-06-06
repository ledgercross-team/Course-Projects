export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1') as `0x${string}`;

export const SUPPORTED_CHAINS = {
  localhost: 31337,
  sepolia: 11155111,
} as const;
