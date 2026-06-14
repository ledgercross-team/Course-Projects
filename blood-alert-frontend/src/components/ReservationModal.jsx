import { useState } from "react";
import api from "../services/api";

function ReservationModal({ bankId }) {
  const [show, setShow] = useState(false);

  const [patientName, setPatientName] =
    useState("");

  const [bloodGroup, setBloodGroup] =
    useState("");

  const [quantity, setQuantity] =
    useState(1);

  const [phone, setPhone] =
    useState("");

  const submitReservation = async () => {
    try {
      await api.post(
        "/reservations/create/",
        {
          blood_bank: bankId,
          patient_name: patientName,
          blood_group: bloodGroup,
          quantity,
          phone,
        }
      );

      alert(
        "Reservation Created Successfully"
      );

      setShow(false);
    } catch (error) {
      console.log(error);
      alert("Reservation Failed");
    }
  };

  return (
    <>
      <button
        onClick={() => setShow(true)}
      >
        Reserve Blood
      </button>

      {show && (
        <div className="modal">
          <div className="modal-content">

            <h2>
              Reserve Blood
            </h2>

            <input
              placeholder="Patient Name"
              value={patientName}
              onChange={(e) =>
                setPatientName(
                  e.target.value
                )
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
              <option value="">
                Blood Group
              </option>

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
              value={quantity}
              onChange={(e) =>
                setQuantity(
                  e.target.value
                )
              }
            />

            <input
              placeholder="Phone"
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value
                )
              }
            />

            <button
              onClick={
                submitReservation
              }
            >
              Confirm
            </button>

            <button
              onClick={() =>
                setShow(false)
              }
            >
              Close
            </button>

          </div>
        </div>
      )}
    </>
  );
}

export default ReservationModal;