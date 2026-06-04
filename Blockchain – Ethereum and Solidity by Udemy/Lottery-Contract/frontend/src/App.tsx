import { useState } from 'react';
import { useLottery } from './hooks/useLottery';
import './App.css';

function App() {
  const {
    data,
    loading,
    error,
    transactionPending,
    message,
    enter,
    pick,
    setMessage,
    setError
  } = useLottery();

  const [value, setValue] = useState('');

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    await enter(value);
    setValue('');
  };

  const onPickWinner = async () => {
    setMessage(null);
    setError(null);
    await pick();
  };

  if (loading && !data) {
    return <div className="loading">Loading contract data...</div>;
  }

  return (
    <div className="container">
      <h1>Lottery Contract</h1>
      <p>
        This contract is managed by {data?.manager}.
        There are currently {data?.playersCount} people entered,
        competing to win {data?.balance} ether!
      </p>

      <hr />

      <form onSubmit={onSubmit}>
        <h4>Want to try your luck?</h4>
        <div>
          <label>Amount of ether to enter</label>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={transactionPending}
            placeholder="0.01"
          />
        </div>
        <button disabled={transactionPending}>Enter</button>
      </form>

      <hr />

      <h4>Ready to pick a winner?</h4>
      <button 
        onClick={onPickWinner} 
        disabled={transactionPending}
      >
        Pick Winner
      </button>

      <hr />

      {message && <div className="message success">{message}</div>}
      {error && <div className="message error">{error}</div>}
      {transactionPending && <div className="spinner">Transaction in progress...</div>}
    </div>
  );
}

export default App;
