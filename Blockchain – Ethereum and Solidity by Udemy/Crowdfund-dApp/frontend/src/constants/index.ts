export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0') as `0x${string}`;

export const SUPPORTED_CHAINS = {
  localhost: 31337,
  sepolia: 11155111,
} as const;
