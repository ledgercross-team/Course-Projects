import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import ReservationForm from "../components/ReservationForm";
import ReservationModal
from "../components/ReservationModal";

function Home() {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 👇 এখানে add করো
  const reserveBlood = async (bloodBankId) => {
    try {
      await api.post(
        "/reservations/create/",
        {
          blood_bank: bloodBankId,
          patient_name: "Demo Patient",
          blood_group: "O+",
          quantity: 2,
          phone: "01700000000",
        }
      );

      alert("Reservation Created Successfully");
    } catch (error) {
      console.log(error);
      alert("Reservation Failed");
    }
  };

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

  return (
    <>
      <Navbar />

      <div className="hero">
        <h1>Find Blood Fast</h1>
        <p>Search nearby blood banks and reserve blood units.</p>
      </div>

      <div className="container">
        {banks.map((bank) => (
          <div key={bank.id} className="card">
            <h2>{bank.name}</h2>

            <p>📍 {bank.address}</p>
            <p>📞 {bank.phone}</p>

            {/* 👇 Button replace করো */}
            <ReservationModal
  bankId={bank.id}
/>
          </div>
        ))}
      </div>
    </>
  );
}

export default Home;