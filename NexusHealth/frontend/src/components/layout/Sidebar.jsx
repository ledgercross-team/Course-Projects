// frontend/src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ClipboardList, ImageIcon, LayoutDashboard, Pill, ShieldAlert, ShieldCheck, Stethoscope, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { selectCurrentUser } from '@/features/auth/authSlice';

const NAV_BY_ROLE = {
  PATIENT: [
    { to: '/patient/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/patient/prescriptions', label: 'Prescription', icon: Pill },
    { to: '/patient/doctors', label: 'Doctors', icon: Stethoscope },
    { to: '/patient/physical-prescriptions', label: 'Physical Prescriptions', icon: ImageIcon },
    { to: '/patient/consent', label: 'Consent Center', icon: ShieldCheck },
  ],
  PHYSICIAN: [
    { to: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/doctor/patients', label: 'Patients', icon: Users },
    { to: '/doctor/break-glass', label: 'Emergency Access', icon: ShieldAlert },
  ],
  CMO: [
    { to: '/cmo/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/cmo/compliance-queue', label: 'Compliance Queue', icon: ShieldCheck },
    { to: '/doctor/patients', label: 'Patients', icon: Users },
  ],
  ADMIN: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users/invite', label: 'Invite Users', icon: ClipboardList },
  ],
};

export default function Sidebar() {
  const user = useSelector(selectCurrentUser);
  const links = NAV_BY_ROLE[user?.role] || [];

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="border-b px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Health Platform</p>
        <h2 className="mt-1 text-lg font-semibold text-foreground">Clinical Portal</h2>
      </div>
      <nav className="flex flex-1 flex-col gap-2 p-4" aria-label="Main navigation">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-[44px] items-center gap-3 rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
