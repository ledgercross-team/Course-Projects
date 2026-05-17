import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout, reset } from '@/store/authSlice';
import { Menu, X, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const onLogout = () => {
    dispatch(logout());
    dispatch(reset());
    navigate('/');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-3xl font-black text-gray-900 tracking-tighter">Ledger<span className="text-primary">Turf</span></span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-10">
            <Link to="/turfs" className="text-gray-500 hover:text-primary transition font-bold text-sm uppercase tracking-widest">Find Turfs</Link>
            {user ? (
              <div className="flex items-center space-x-6">
                <Link 
                  to={user.role === 'superAdmin' ? '/dashboard/admin' : user.role === 'turfOwner' ? '/dashboard/owner' : '/dashboard/player'} 
                  className="flex items-center bg-primary/10 text-primary px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
                <button 
                  onClick={onLogout}
                  className="text-gray-400 hover:text-red-500 transition font-black text-xs uppercase tracking-widest flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-6">
                <Link to="/login" className="text-gray-900 hover:text-primary transition font-black text-xs uppercase tracking-widest">Login</Link>
                <Link to="/register/player" className="bg-gray-900 text-white px-8 py-3.5 rounded-2xl hover:bg-primary transition shadow-xl shadow-gray-200 font-black text-xs uppercase tracking-widest active:scale-95">Join Now</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-900 p-2 focus:outline-none"
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 animate-in slide-in-from-top duration-300">
          <div className="px-6 pt-4 pb-10 space-y-4">
            <Link to="/turfs" onClick={() => setIsOpen(false)} className="block py-4 text-gray-900 font-black text-xl border-b border-gray-50">Find Turfs</Link>
            {user ? (
              <>
                <Link to="/dashboard" onClick={() => setIsOpen(false)} className="block py-4 text-primary font-black text-xl border-b border-gray-50">Dashboard</Link>
                <button onClick={() => { onLogout(); setIsOpen(false); }} className="w-full text-left py-4 text-red-500 font-black text-xl">Sign Out</button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setIsOpen(false)} className="block py-4 text-gray-900 font-black text-xl border-b border-gray-50">Login</Link>
                <Link to="/register/player" onClick={() => setIsOpen(false)} className="block py-6 bg-primary text-white text-center rounded-3xl font-black text-2xl shadow-xl shadow-primary/20 mt-8">Join Now</Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
