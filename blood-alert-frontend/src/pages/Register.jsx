import { useState } from "react";
import api from "../services/api";

function Register() {
  const [formData, setFormData] =
    useState({
      username: "",
      email: "",
      password: "",
    });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.post(
        "/accounts/register/",
        formData
      );

      alert("Registration Successful");

      window.location.href = "#/login";
    } catch (error) {
      console.log(error);
      alert("Registration Failed");
    }
  };

  return (
    <div className="container">
      <h1>Register</h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          onChange={(e) =>
            setFormData({
              ...formData,
              username: e.target.value,
            })
          }
        />

        <input
          type="email"
          placeholder="Email"
          onChange={(e) =>
            setFormData({
              ...formData,
              email: e.target.value,
            })
          }
        />

        <input
          type="password"
          placeholder="Password"
          onChange={(e) =>
            setFormData({
              ...formData,
              password: e.target.value,
            })
          }
        />

        <button type="submit">
          Register
        </button>
      </form>
    </div>
  );
}

export default Register;