import { useState } from "react";
import api from "../services/api";

function ReservationModal({ bankId }) {
  const [patientName, setPatientName] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [bloodGroup, setBloodGroup] =
    useState("O+");

  const [units, setUnits] =
    useState(1);

  const createReservation = async () => {
    const token =
      localStorage.getItem("access");

    if (!token) {
      alert("Please login first");
      window.location.href =
        "#/login";
      return;
    }

    try {
      await api.post(
        "/reservations/create/",
        {
          blood_bank: bankId,
          patient_name: patientName,
          phone: phone,
          blood_group: bloodGroup,
          units: Number(units),
        }
      );

      alert(
        "Reservation Created Successfully"
      );

      setPatientName("");
      setPhone("");
      setBloodGroup("O+");
      setUnits(1);
    } catch (error) {
      console.log(error);
      alert("Reservation Failed");
    }
  };

  return (
    <div>
      <input
        type="text"
        placeholder="Patient Name"
        value={patientName}
        onChange={(e) =>
          setPatientName(
            e.target.value
          )
        }
      />

      <input
        type="text"
        placeholder="Phone Number"
        value={phone}
        onChange={(e) =>
          setPhone(e.target.value)
        }
      />

      <select
        value={bloodGroup}
        onChange={(e) =>
          setBloodGroup(
            e.target.value
          )
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
        value={units}
        onChange={(e) =>
          setUnits(
            e.target.value
          )
        }
      />

      <button
        onClick={
          createReservation
        }
      >
        Reserve Blood
      </button>
    </div>
  );
}

export default ReservationModal;