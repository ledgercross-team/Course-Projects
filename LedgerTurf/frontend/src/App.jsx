import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Navbar from '@/components/layout/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ScrollToTop from '@/components/common/ScrollToTop';

// Pages
import Home from '@/pages/Home';
import Login from '@/pages/auth/Login';
import RegisterPlayer from '@/pages/auth/RegisterPlayer';
import RegisterOwner from '@/pages/auth/RegisterOwner';
import TurfListing from './pages/turf/TurfListing';
import NightTurfs from './pages/turf/NightTurfs';
import TurfDetails from './pages/turf/TurfDetails';
import UserDashboard from '@/pages/dashboard/UserDashboard';
import OwnerDashboard from '@/pages/dashboard/OwnerDashboard';
import AdminDashboard from '@/pages/dashboard/AdminDashboard';

const DashboardRedirect = () => {
  const { user } = useSelector((state) => state.auth);
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'superAdmin') return <Navigate to="/dashboard/admin" />;
  if (user.role === 'turfOwner') return <Navigate to="/dashboard/owner" />;
  return <Navigate to="/dashboard/player" />;
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Routes>
        {/* Public Routes with Navbar */}
        <Route element={<><Navbar /><Outlet /></>}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register/player" element={<RegisterPlayer />} />
          <Route path="/register/owner" element={<RegisterOwner />} />
          <Route path="/turfs" element={<TurfListing />} />
          <Route path="/turfs/night" element={<NightTurfs />} />
          <Route path="/turfs/:id" element={<TurfDetails />} />
        </Route>

        {/* Private Dashboard Routes with Sidebar */}
        <Route element={<ProtectedRoute allowedRoles={['player', 'turfOwner', 'superAdmin']} />}>
          <Route element={<DashboardLayout><Outlet /></DashboardLayout>}>
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/dashboard/player" element={<UserDashboard />} />
            <Route path="/dashboard/owner" element={<Navigate to="/dashboard/owner/turfs" replace />} />
            <Route path="/dashboard/owner/turfs" element={<OwnerDashboard />} />
            <Route path="/dashboard/owner/reservations" element={<OwnerDashboard />} />
            <Route path="/dashboard/owner/analytics" element={<OwnerDashboard />} />
            <Route path="/dashboard/owner/new-listing" element={<OwnerDashboard />} />
            <Route path="/dashboard/admin" element={<Navigate to="/dashboard/admin/approvals" replace />} />
            <Route path="/dashboard/admin/approvals" element={<AdminDashboard />} />
            <Route path="/dashboard/admin/players" element={<AdminDashboard />} />
            <Route path="/dashboard/admin/owners" element={<AdminDashboard />} />
            <Route path="/dashboard/admin/stats" element={<AdminDashboard />} />
          </Route>
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
