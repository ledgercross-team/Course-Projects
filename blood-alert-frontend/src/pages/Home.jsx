import { useEffect } from "react";
import api from "../services/api";

function Home() {
  useEffect(() => {
    api
      .get("/bloodbanks/")
      .then((response) => {
        console.log("Blood Banks:", response.data);
      })
      .catch((error) => {
        console.log("Error:", error);
      });
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>🩸 Blood Alert System</h1>
      <p>Loading Blood Banks...</p>
    </div>
  );
}

export default Home;