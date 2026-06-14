import { useState } from "react";
import api from "../services/api";

function ReservationForm({ bloodBankId }) {
  const [patientName, setPatientName] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post("/reservations/create/", {
        blood_bank: bloodBankId,
        patient_name: patientName,
        blood_group: bloodGroup,
        quantity,
        phone,
      });

      alert("Reservation Created Successfully");
    } catch (error) {
      console.log(error);
      alert("Reservation Failed");
    }
  };
return (
  <form onSubmit={handleSubmit}>
    <input
      type="text"
      placeholder="Patient Name"
      value={patientName}
      onChange={(e) => setPatientName(e.target.value)}
      required
    />

    <select
      value={bloodGroup}
      onChange={(e) => setBloodGroup(e.target.value)}
      required
    >
      <option value="">Blood Group</option>
      <option>O+</option>
      <option>O-</option>
      <option>A+</option>
      <option>A-</option>
      <option>B+</option>
      <option>B-</option>
      <option>AB+</option>
      <option>AB-</option>
    </select>

    <input
      type="number"
      placeholder="Quantity"
      value={quantity}
      onChange={(e) => setQuantity(e.target.value)}
      min="1"
      required
    />

    <input
      type="text"
      placeholder="Phone Number"
      value={phone}
      onChange={(e) => setPhone(e.target.value)}
      required
    />

    <button type="submit">
      Confirm Reservation
    </button>
  </form>
);
 
}

export default ReservationForm;
