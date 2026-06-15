import { useState } from "react";
import api from "../services/api";

function ReservationModal({ bankId }) {
  const [patientName, setPatientName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [bloodGroup, setBloodGroup] =
    useState("O+");

  const [quantity, setQuantity] =
    useState(1);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token =
        localStorage.getItem("access");

      await api.post(
        "/reservations/create/",
        {
          patient_name: patientName,
          phone: phone,
          blood_group: bloodGroup,
          quantity: Number(quantity),
          blood_bank: bankId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      alert(
        "Reservation Created Successfully"
      );

      setPatientName("");
      setPhone("");
      setBloodGroup("O+");
      setQuantity(1);
    } catch (error) {
      console.log(error);

      console.log(
        "Backend Error:",
        error.response?.data
      );

      alert(
        JSON.stringify(
          error.response?.data
        )
      );
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Patient Name"
        value={patientName}
        onChange={(e) =>
          setPatientName(e.target.value)
        }
        required
      />

      <input
        type="text"
        placeholder="Phone Number"
        value={phone}
        onChange={(e) =>
          setPhone(e.target.value)
        }
        required
      />

      <select
        value={bloodGroup}
        onChange={(e) =>
          setBloodGroup(e.target.value)
        }
      >
        <option value="A+">A+</option>
        <option value="A-">A-</option>
        <option value="B+">B+</option>
        <option value="B-">B-</option>
        <option value="AB+">AB+</option>
        <option value="AB-">AB-</option>
        <option value="O+">O+</option>
        <option value="O-">O-</option>
      </select>

      <input
        type="number"
        min="1"
        placeholder="Units"
        value={quantity}
        onChange={(e) =>
          setQuantity(e.target.value)
        }
        required
      />

      <button
        type="submit"
        className="reserve-btn"
      >
        Reserve Blood
      </button>
    </form>
  );
}

export default ReservationModal;