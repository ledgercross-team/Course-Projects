import React from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";
import Sidebar from "./components/Sidebar.jsx";
import RoleGuard from "./components/RoleGuard.jsx";

import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import CreatorDashboard from "./pages/CreatorDashboard.jsx";
import UploadWill from "./pages/UploadWill.jsx";
import WitnessDashboard from "./pages/WitnessDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import BeneficiaryDashboard from "./pages/BeneficiaryDashboard.jsx";
import ViewWill from "./pages/ViewWill.jsx";

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="content-shell">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />

            <Route
              path="/creator"
              element={
                <RoleGuard roles={["creator"]}>
                  <CreatorDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/upload"
              element={
                <RoleGuard roles={["creator"]}>
                  <UploadWill />
                </RoleGuard>
              }
            />
            <Route
              path="/witness"
              element={
                <RoleGuard roles={["witness"]}>
                  <WitnessDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/admin"
              element={
                <RoleGuard roles={["admin"]}>
                  <AdminDashboard />
                </RoleGuard>
              }
            />
            <Route
              path="/beneficiary"
              element={
                <RoleGuard roles={["beneficiary"]}>
                  <BeneficiaryDashboard />
                </RoleGuard>
              }
            />

            <Route
              path="/will/:id"
              element={
                <RoleGuard roles={["creator", "witness", "admin", "beneficiary"]}>
                  <ViewWill />
                </RoleGuard>
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}
