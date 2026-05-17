import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  History, 
  Settings, 
  LogOut, 
  MapPin, 
  PlusCircle, 
  Users, 
  ShieldCheck, 
  PieChart,
  Briefcase
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { logout, reset } from '@/store/authSlice';

const Sidebar = ({ role }) => {
  const location = useLocation();
  const dispatch = useDispatch();

  const playerLinks = [
    { name: 'Overview', path: '/dashboard/player', icon: LayoutDashboard },
    { name: 'My Bookings', path: '/dashboard/player/bookings', icon: Calendar },
    { name: 'Find Turfs', path: '/turfs', icon: MapPin },
  ];

  const ownerLinks = [
    { name: 'My Turfs', path: '/dashboard/owner/turfs', icon: LayoutDashboard },
    { name: 'Reservations', path: '/dashboard/owner/reservations', icon: Calendar },
    { name: 'Analytics', path: '/dashboard/owner/analytics', icon: PieChart },
    { name: 'New Listing', path: '/dashboard/owner/new-listing', icon: PlusCircle },
  ];

  const adminLinks = [
    { name: 'Approval Queue', path: '/dashboard/admin/approvals', icon: ShieldCheck },
    { name: 'All Players', path: '/dashboard/admin/players', icon: Users },
    { name: 'All Owners', path: '/dashboard/admin/owners', icon: Briefcase },
    { name: 'Platform Stats', path: '/dashboard/admin/stats', icon: PieChart },
  ];

  const links = role === 'superAdmin' ? adminLinks : role === 'turfOwner' ? ownerLinks : playerLinks;

  const onLogout = () => {
    dispatch(logout());
    dispatch(reset());
  };

  return (
    <div className="w-80 h-screen bg-gray-900 text-white flex flex-col p-8 fixed left-0 top-0 z-[60]">
      <div className="mb-12">
        <Link to="/" className="text-3xl font-black text-white tracking-tighter">
          Ledger<span className="text-primary">Turf</span>
        </Link>
        <div className="mt-4 bg-white/10 px-3 py-1 rounded-lg inline-block">
          <span className="text-[10px] font-black uppercase tracking-widest text-primary-light">
            {role?.replace('superAdmin', 'Administrator')?.replace('turfOwner', 'Owner')?.replace('player', 'Athlete')}
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link 
              key={link.path}
              to={link.path}
              className={`
                flex items-center gap-4 px-6 py-4 rounded-2xl font-bold transition-all
                ${isActive 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }
              `}
            >
              <Icon size={20} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="pt-8 border-t border-white/5">
        <button 
          onClick={onLogout}
          className="flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-red-400 hover:bg-red-500/10 transition-all w-full"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
