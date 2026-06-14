function BloodBankCard({ bank }) {
  return (
    <div className="card">
      <h3>{bank.name}</h3>

      <p>📍 {bank.city}</p>

      <p>📞 {bank.phone}</p>

      <button>Reserve Blood</button>
    </div>
  );
}

export default BloodBankCard;