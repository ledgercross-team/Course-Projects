import { useState, useEffect, useCallback } from 'react';
import { getLotteryData, enterLottery, pickWinner } from '../services/lottery';
import type { LotteryData } from '../types';

export const useLottery = () => {
  const [data, setData] = useState<LotteryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionPending, setTransactionPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const lotteryData = await getLotteryData();
      setData(lotteryData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch lottery data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const enter = async (amount: string) => {
    try {
      setTransactionPending(true);
      setMessage('Waiting on transaction success...');
      await enterLottery(amount);
      setMessage('You have been entered!');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      setMessage(null);
    } finally {
      setTransactionPending(false);
    }
  };

  const pick = async () => {
    try {
      setTransactionPending(true);
      setMessage('Waiting on transaction success...');
      await pickWinner();
      setMessage('A winner has been picked!');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      setMessage(null);
    } finally {
      setTransactionPending(false);
    }
  };

  return {
    data,
    loading,
    error,
    transactionPending,
    message,
    enter,
    pick,
    refresh: fetchData,
    setMessage,
    setError
  };
};
