export interface LotteryData {
  manager: string;
  playersCount: number;
  balance: string;
}

export interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
}
