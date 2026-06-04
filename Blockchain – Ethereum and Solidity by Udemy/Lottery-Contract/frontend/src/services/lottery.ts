import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';
import abi from './abi.json';

const CONTRACT_ADDRESS = import.meta.env.VITE_LOTTERY_CONTRACT_ADDRESS;

if (!CONTRACT_ADDRESS) {
  console.warn('VITE_LOTTERY_CONTRACT_ADDRESS is not defined in .env');
}

export const getProvider = () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }
  return new BrowserProvider(window.ethereum);
};

export const getLotteryContract = async (withSigner = false) => {
  const provider = getProvider();
  const runner = withSigner ? await provider.getSigner() : provider;
  return new Contract(CONTRACT_ADDRESS, abi, runner);
};

export const getLotteryData = async () => {
  const contract = await getLotteryContract();
  const [manager, players] = await Promise.all([
    contract.manager(),
    contract.getPlayers()
  ]);
  
  const provider = getProvider();
  const balance = await provider.getBalance(CONTRACT_ADDRESS);

  return {
    manager,
    playersCount: players.length,
    balance: formatEther(balance)
  };
};

export const enterLottery = async (amount: string) => {
  const contract = await getLotteryContract(true);
  const tx = await contract.enter({
    value: parseEther(amount)
  });
  return await tx.wait();
};

export const pickWinner = async () => {
  const contract = await getLotteryContract(true);
  const tx = await contract.pickWinner();
  return await tx.wait();
};
