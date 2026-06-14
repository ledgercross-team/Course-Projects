// frontend/src/app/router.jsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from '@/components/layout/AppShell';
import LoginPage from '@/features/auth/LoginPage';
import SignupPage from '@/features/auth/SignupPage';
import ProtectedRoute from '@/features/auth/ProtectedRoute';
import UnauthorizedPage from '@/features/auth/UnauthorizedPage';
import InviteUserPage from '@/features/admin/InviteUserPage';
import ConsentCenterPage from '@/features/consent/ConsentCenterPage';
import PatientDashboard from '@/features/dashboard/PatientDashboard';
import PatientPrescriptionsPage from '@/features/prescriptions/PatientPrescriptionsPage';
import PatientDoctorsPage from '@/features/doctors/PatientDoctorsPage';
import PhysicianPatientsPage from '@/features/patients/PhysicianPatientsPage';
import PhysicalPrescriptionsPage from '@/features/physicalPrescriptions/PhysicalPrescriptionsPage';
import PatientPhysicalImagesPage from '@/features/physicalPrescriptions/PatientPhysicalImagesPage';
import PhysicianBreakGlassPage from '@/features/breakGlass/PhysicianBreakGlassPage';
import CmoComplianceQueuePage from '@/features/breakGlass/CmoComplianceQueuePage';
import LandingPage from '@/features/landing/LandingPage';
import PhysicianDashboard from '@/features/dashboard/PhysicianDashboard';
import CmoDashboard from '@/features/dashboard/CmoDashboard';
import AdminDashboard from '@/features/dashboard/AdminDashboard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/welcome',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            element: <ProtectedRoute allowedRoles={['PATIENT']} />,
            children: [
              {
                path: '/patient',
                children: [
                  { index: true, element: <Navigate to="/patient/dashboard" replace /> },
                  { path: 'dashboard', element: <PatientDashboard /> },
                  { path: 'prescriptions', element: <PatientPrescriptionsPage /> },
                  { path: 'doctors', element: <PatientDoctorsPage /> },
                  { path: 'physical-prescriptions', element: <PhysicalPrescriptionsPage /> },
                  { path: 'consent', element: <ConsentCenterPage /> },
                ],
              },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['PHYSICIAN', 'CMO']} />,
            children: [
              { path: '/doctor/patients', element: <PhysicianPatientsPage /> },
              { path: '/doctor/patients/:patientId/images', element: <PatientPhysicalImagesPage /> },
              { path: '/doctor/break-glass', element: <PhysicianBreakGlassPage /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['PHYSICIAN', 'PHARMACIST']} />,
            children: [
              {
                path: '/doctor',
                children: [
                  { index: true, element: <Navigate to="/doctor/dashboard" replace /> },
                  { path: 'dashboard', element: <PhysicianDashboard /> },
                ],
              },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['CMO']} />,
            children: [
              {
                path: '/cmo',
                children: [
                  { index: true, element: <Navigate to="/cmo/dashboard" replace /> },
                  { path: 'dashboard', element: <CmoDashboard /> },
                  { path: 'compliance-queue', element: <CmoComplianceQueuePage /> },
                ],
              },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['ADMIN']} />,
            children: [
              {
                path: '/admin',
                children: [
                  { index: true, element: <Navigate to="/admin/dashboard" replace /> },
                  { path: 'dashboard', element: <AdminDashboard /> },
                  { path: 'users/invite', element: <InviteUserPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
