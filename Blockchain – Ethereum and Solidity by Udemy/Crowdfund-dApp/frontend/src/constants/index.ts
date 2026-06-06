export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0x8A791620dd6260079BF849Dc5567aDC3F2FdC318') as `0x${string}`;

export const SUPPORTED_CHAINS = {
  localhost: 31337,
  sepolia: 11155111,
} as const;
