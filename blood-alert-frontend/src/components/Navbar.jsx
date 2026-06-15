import { Link } from "react-router-dom";

function Navbar() {
  const token = localStorage.getItem("access");

  return (
    <nav className="navbar">
      <div className="logo">
        🩸 Blood Alert
      </div>

      <div className="nav-links">
        <Link to="/">Home</Link>

        <Link to="/reservations">
          Reservations
        </Link>

        

        {!token ? (
          <>

           <Link to="/profile">
                  Profile
               </Link>

               <Link to="/alerts">
                  Alerts
               </Link>

            <Link to="/login">
              Login
            </Link>

             

            <Link to="/register">
              Register
            </Link>
          </>
        ) : (
          <button
            className="logout-btn"
            onClick={() => {
              localStorage.clear();
              window.location.href = "#/login";
            }}
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;