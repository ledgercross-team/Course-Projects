 import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import ReservationModal from "../components/ReservationModal";

function Home() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/bloodbanks/")
      .then((response) => {
        setBanks(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.log(error);
        setError("Failed to load blood banks.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <h2>Loading...</h2>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <h2>{error}</h2>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="hero">
        <h1>Find Blood Fast</h1>
        <p>
          Search nearby blood banks and reserve blood units.
        </p>
      </div>

      <div className="container">
        {banks.map((bank) => (
          <div key={bank.id} className="card">
            <h2>{bank.name}</h2>

            <p>📍 {bank.address}</p>
            <p>📞 {bank.phone}</p>
            <h4>Available Blood</h4>

{bank.inventory?.map((item, index) => (
  <div key={index}>
    <p>
      🩸 {item.blood_group} : {item.units_available} Units
    </p>

    {item.is_critical && (
      <span
        style={{
          background: "#ff4d4f",
          color: "white",
          padding: "4px 8px",
          borderRadius: "5px",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        ⚠ LOW STOCK
      </span>
    )}
  </div>
))}

            
            <ReservationModal bankId={bank.id} />
          </div>
        ))}
      </div>
    </>
  );
}

export default Home;