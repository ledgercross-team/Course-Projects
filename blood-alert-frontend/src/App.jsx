 import { HashRouter, Routes, Route } from "react-router-dom";

import "./App.css";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Reservations from "./pages/Reservations";
import Alerts from "./pages/Alerts";

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/profile"
          element={<Profile />}
        />

        <Route
          path="/reservations"
          element={<Reservations />}
        />

        <Route
          path="/alerts"
          element={<Alerts />}
        />
      </Routes>
    </HashRouter>
  );
}

export default App;