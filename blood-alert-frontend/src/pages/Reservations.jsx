import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";

function Reservations() {
  const [reservations, setReservations] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    api
      .get("/reservations/")
      .then((response) => {
        setReservations(response.data);
        setLoading(false);
      })
      .catch((error) => {
        console.log(error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="hero">
          <h1>Loading...</h1>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />

      <div className="hero">
        <h1>Reservation History</h1>
      </div>

      <div className="container">
        {reservations.length === 0 ? (
          <h3>No Reservations Found</h3>
        ) : (
          reservations.map((item) => (
            <div
              key={item.id}
              className="card"
            >
              <h3>
                {item.patient_name}
              </h3>

              <p>
                🩸 Blood Group:
                {" "}
                {item.blood_group}
              </p>

              <p>
                📦 Units:
                {" "}
                {item.quantity}
              </p>

              <p>
                📞 Phone:
                {" "}
                {item.phone}
              </p>

              <p>
                Status:
                {" "}
                {item.status}
              </p>

              {item.status ===
              "approved" ? (
                <p
                  style={{
                    color: "green",
                    fontWeight:
                      "bold",
                  }}
                >
                  ✅ Approved
                </p>
              ) : (
                <p
                  style={{
                    color: "orange",
                    fontWeight:
                      "bold",
                  }}
                >
                  ⏳ Pending
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}

export default Reservations;