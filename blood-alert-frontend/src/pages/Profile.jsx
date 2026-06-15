import Navbar from "../components/Navbar";

function Profile() {
  return (
    <>
      <Navbar />

      <div className="hero">
        <h1>My Profile</h1>
      </div>

      <div className="container">
        <div className="card">
          <h2>User Profile</h2>

          <p>👤 Username</p>

          <p>📧 Email</p>

          <p>🩸 Total Reservations</p>
        </div>
      </div>
    </>
  );
}

export default Profile;