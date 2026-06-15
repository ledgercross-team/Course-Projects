import { useState } from "react";
import api from "../services/api";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await api.post("/token/", {
        username,
        password,
      });

      localStorage.setItem(
        "access",
        response.data.access
      );

      localStorage.setItem(
        "refresh",
        response.data.refresh
      );

      alert("Login Successful");

      window.location.href = "/";
    } catch (error) {
      console.log(error);
      alert("Login Failed");
    }
  };

  return (
    <div className="container">
      <h1>Login</h1>

      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
        />

        <button type="submit">
          Login
        </button>
      </form>
    </div>
  );
}

export default Login;