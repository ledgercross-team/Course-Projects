// frontend/src/features/dashboard/PatientDashboard.jsx
import DashboardPage from './DashboardPage';
import PatientBreakGlassBanner from '@/features/breakGlass/PatientBreakGlassBanner';

export default function PatientDashboard() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <PatientBreakGlassBanner />
      <DashboardPage
        title="Patient Dashboard"
        description="Your health portal overview. Use the sidebar to view prescriptions, manage doctors, and control consent."
      />
    </div>
  );
}
