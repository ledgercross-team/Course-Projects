import { useEffect, useState }
from "react";

import api from "../services/api";
import Navbar from "../components/Navbar";

function Alerts() {

  const [alerts, setAlerts] =
    useState([]);

  useEffect(() => {

    api
      .get("/alerts/")
      .then((response) => {
        setAlerts(
          response.data
        );
      });

  }, []);

  return (
    <>
      <Navbar />

      <div className="hero">
        <h1>
          Critical Alerts
        </h1>
      </div>

      <div className="container">

        {alerts.length === 0 ? (
          <h3>
            No Critical Alerts
          </h3>
        ) : (
          alerts.map(
            (alert, index) => (
              <div
                key={index}
                className="card"
              >
                <h3>
                  ⚠ {
                    alert.blood_bank
                  }
                </h3>

                <p>
                  Blood Group:
                  {" "}
                  {
                    alert.blood_group
                  }
                </p>

                <p>
                  Units:
                  {" "}
                  {
                    alert.units
                  }
                </p>
              </div>
            )
          )
        )}

      </div>
    </>
  );
}

export default Alerts;