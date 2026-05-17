import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import turfService from '@/services/turfService';
import api from '@/services/api';
import MapComponent from '@/components/turf/MapComponent';
import { 
  ShieldCheck, CheckCircle, XCircle, Clock, MapPin, Loader2, 
  User as UserIcon, Users, CreditCard, Activity, Trash2, Edit, Save, X, Info, Trophy
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Sync tab with URL
  const getTabFromPath = (path) => {
    if (path.includes('/players')) return 'players';
    if (path.includes('/owners')) return 'owners';
    if (path.includes('/stats')) return 'stats';
    return 'approvals';
  };

  const tab = getTabFromPath(location.pathname);

  const [pendingTurfs, setPendingTurfs] = React.useState([]);
  const [allUsers, setAllUsers] = React.useState([]);
  const [stats, setStats] = React.useState({
    totalPlayers: 0, totalOwners: 0, totalBookings: 0, totalRevenue: 0, totalActiveTurfs: 0
  });
  const [loading, setLoading] = React.useState(true);
  const [selectedTurf, setSelectedTurf] = React.useState(null);
  const [previewImg, setPreviewImg] = React.useState('');
  
  // Editing state
  const [editingUser, setEditingUser] = React.useState(null);
  const [editFormData, setEditFormData] = React.useState({ name: '', phone: '', email: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [turfsRes, statsRes, usersRes, activeTurfsRes] = await Promise.all([
        turfService.getTurfs({ status: 'pending' }),
        api.get('/admin/stats'),
        api.get('/admin/users'),
        turfService.getTurfs({ status: 'approved', limit: 1 })
      ]);
      
      console.log('AdminDashboard - Pending Turfs raw:', turfsRes);
      console.log('AdminDashboard - Stats raw:', statsRes.data);
      console.log('AdminDashboard - Users raw:', usersRes.data);
      
      setPendingTurfs(turfsRes.data);
      setStats({
        ...statsRes.data.data,
        totalActiveTurfs: activeTurfsRes.pagination?.total || activeTurfsRes.count || 0
      });
      setAllUsers(usersRes.data.data);
    } catch (error) {
      toast.error('Failed to load platform data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  // Update preview image when selected turf changes
  React.useEffect(() => {
    if (selectedTurf) {
      setPreviewImg(selectedTurf.images?.[0] || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800');
    }
  }, [selectedTurf]);

  const handleApproval = async (id, status) => {
    try {
      await turfService.approveTurf(id, status);
      toast.success(`Turf ${status} successfully`);
      
      // Dynamic update: remove from pending list immediately
      setPendingTurfs(prev => prev.filter(t => t._id !== id));
      
      // Clear selection if it was the one approved/rejected
      if (selectedTurf?._id === id) setSelectedTurf(null);
      
      // Update global stats
      setStats(prev => ({
        ...prev,
        totalActiveTurfs: status === 'approved' ? prev.totalActiveTurfs + 1 : prev.totalActiveTurfs
      }));
    } catch (error) {
      toast.error('Action failed');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Delete this user permanently?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      setAllUsers(prev => prev.filter(u => u._id !== id));
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  const startEdit = (user) => {
    setEditingUser(user._id);
    setEditFormData({ name: user.name, phone: user.phone, email: user.email });
  };

  const handleUpdateUser = async (id) => {
    try {
      await api.put(`/admin/users/${id}`, editFormData);
      toast.success('User updated');
      setEditingUser(null);
      setAllUsers(prev => prev.map(u => u._id === id ? { ...u, ...editFormData } : u));
    } catch (error) {
      toast.error('Update failed');
    }
  };

  const filteredUsers = tab === 'players' 
    ? allUsers.filter(u => u.role === 'player')
    : allUsers.filter(u => u.role === 'turfOwner');

  if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">Control Panel</h1>
          <p className="text-gray-500 font-medium mt-2">Oversee Dhaka's turf ecosystem.</p>
        </div>
      </header>

      {tab === 'stats' && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <StatCard icon={Users} label="Total Players" val={stats.totalPlayers} color="blue" />
            <StatCard icon={Briefcase} label="Total Owners" val={stats.totalOwners} color="purple" />
            <StatCard icon={CheckCircle} label="Active Turfs" val={stats.totalActiveTurfs} color="green" />
            <StatCard icon={CreditCard} label="Net Revenue" val={`৳${stats.totalRevenue}`} color="primary" isPrimary />
          </div>
          
          <div className="bg-white rounded-[48px] p-12 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-6 mb-10">
              <div className="bg-primary/10 p-4 rounded-3xl text-primary"><Activity size={32} /></div>
              <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Platform Health</h2>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Dynamic performance metrics</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="p-8 bg-gray-50 rounded-[40px] flex justify-between items-center">
                <span className="font-black text-gray-500 uppercase tracking-widest text-sm">Total Bookings</span>
                <span className="text-5xl font-black text-gray-900 tracking-tighter">{stats.totalBookings}</span>
              </div>
              <div className="p-8 bg-gray-50 rounded-[40px] flex justify-between items-center">
                <span className="font-black text-gray-500 uppercase tracking-widest text-sm">Avg. Booking Value</span>
                <span className="text-5xl font-black text-primary tracking-tighter">৳{stats.totalBookings > 0 ? (stats.totalRevenue / stats.totalBookings).toFixed(0) : 0}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'approvals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 bg-white rounded-[48px] shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-10 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-2xl font-black text-gray-900">Pending Requests</h2>
              <span className="bg-primary text-white px-4 py-1 rounded-full text-xs font-black">{pendingTurfs.length} New</span>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingTurfs.length > 0 ? pendingTurfs.map(turf => (
                <div 
                  key={turf._id} 
                  onClick={() => setSelectedTurf(turf)}
                  className={`p-10 flex flex-col md:flex-row items-center gap-10 hover:bg-gray-50 transition-colors group cursor-pointer ${selectedTurf?._id === turf._id ? 'bg-gray-50' : ''}`}
                >
                  <div className="w-40 h-28 rounded-[24px] overflow-hidden shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform">
                    <img 
                      src={turf.images?.[0] || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'} 
                      className="w-full h-full object-cover" 
                      alt="" 
                      onError={(e) => e.target.src = 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800'}
                    />
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-black text-gray-900 leading-tight">{turf.name}</h3>
                      <span className="bg-yellow-100 text-yellow-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Pending</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-gray-500 font-bold text-xs">
                      <span className="flex items-center gap-2"><MapPin size={14} className="text-primary" /> {turf.address}</span>
                      <span className="flex items-center gap-2"><UserIcon size={14} className="text-primary" /> {turf.owner?.name || 'New Owner'}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="p-24 text-center">
                  <CheckCircle className="mx-auto text-green-200 mb-6" size={64} />
                  <h3 className="text-2xl font-black text-gray-900">Queue Clear!</h3>
                  <p className="text-gray-400 font-medium">All turfs have been reviewed.</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            {selectedTurf ? (
              <div className="bg-white rounded-[48px] p-8 shadow-2xl border border-gray-100 sticky top-12 space-y-8 animate-in slide-in-from-right duration-500 overflow-hidden">
                <div className="h-64 -mx-8 -mt-8 relative mb-8">
                  <img 
                    src={previewImg} 
                    className="w-full h-full object-cover" 
                    alt={selectedTurf.name}
                    onError={() => setPreviewImg('https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800')}
                  />
                  <div className="absolute bottom-4 left-6 flex gap-2">
                    {selectedTurf.sportTypes?.map(s => (
                      <span key={s} className="bg-primary/90 backdrop-blur-md text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{s}</span>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-2xl font-black text-gray-900 leading-tight">{selectedTurf.name}</h4>
                  <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                    <MapPin size={16} className="text-primary" />
                    <span>{selectedTurf.location?.area || selectedTurf.address}</span>
                  </div>
                </div>

                <div className="h-48 rounded-[32px] overflow-hidden border-4 border-gray-50 shadow-inner bg-gray-100">
                  <MapComponent turfs={[selectedTurf]} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <span className="text-[10px] text-gray-400 font-black uppercase block mb-1">Owner</span>
                    <span className="font-black text-gray-900 text-sm truncate block">{selectedTurf.owner?.name || 'Unknown'}</span>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-2xl">
                    <span className="text-[10px] text-gray-400 font-black uppercase block mb-1">Price</span>
                    <span className="font-black text-gray-900">৳{selectedTurf.pricePerHour}/hr</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => handleApproval(selectedTurf._id, 'approved')} 
                    className="flex-1 bg-green-500 text-white py-4 rounded-2xl font-black hover:bg-green-600 transition shadow-xl shadow-green-100 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} /> Approve
                  </button>
                  <button 
                    onClick={() => handleApproval(selectedTurf._id, 'rejected')} 
                    className="flex-1 bg-red-50 text-red-500 py-4 rounded-2xl font-black hover:bg-red-100 transition flex items-center justify-center gap-2"
                  >
                    <XCircle size={20} /> Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-[48px] p-12 text-center border-2 border-dashed border-gray-200 h-[600px] flex flex-col justify-center sticky top-12">
                <ShieldCheck className="mx-auto text-gray-200 mb-4" size={48} />
                <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Select a request to preview facility</p>
              </div>
            )}
          </div>
        </div>
      )}

      {(tab === 'players' || tab === 'owners') && (
        <div className="bg-white rounded-[48px] shadow-2xl border border-gray-100 overflow-hidden">
          <div className="p-10 border-b border-gray-50 flex justify-between items-center">
            <h2 className="text-2xl font-black text-gray-900">{tab === 'players' ? 'All Athletes' : 'Verified Owners'}</h2>
            <span className="bg-primary/10 text-primary px-4 py-1 rounded-full text-xs font-black">{filteredUsers.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <tr>
                  <th className="px-10 py-6">Identity</th>
                  <th className="px-10 py-6">Contact Details</th>
                  <th className="px-10 py-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 font-bold">
                {filteredUsers.map(u => (
                  <tr key={u._id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-10 py-8">
                      {editingUser === u._id ? (
                        <div className="space-y-2">
                          <input 
                            className="bg-white border-2 border-primary rounded-xl px-4 py-2 w-full outline-none" 
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">{u.name[0]}</div>
                          <div>
                            <p className="text-gray-900 text-lg">{u.name}</p>
                            <span className={`text-[10px] uppercase tracking-widest ${u.role === 'turfOwner' ? 'text-purple-400' : 'text-blue-400'}`}>{u.role === 'turfOwner' ? 'Owner' : 'Player'}</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-10 py-8">
                       {editingUser === u._id ? (
                        <div className="space-y-4">
                          <input 
                            className="bg-white border-2 border-gray-100 rounded-xl px-4 py-2 w-full outline-none" 
                            value={editFormData.email}
                            onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                            placeholder="Email"
                          />
                          <input 
                            className="bg-white border-2 border-gray-100 rounded-xl px-4 py-2 w-full outline-none" 
                            value={editFormData.phone}
                            onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                            placeholder="Phone"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="text-gray-900 flex items-center gap-2"><UserIcon size={14} className="text-gray-400" /> {u.email}</p>
                          <p className="text-gray-400 font-medium text-sm flex items-center gap-2"><MapPin size={14} className="text-gray-200" /> {u.phone}</p>
                        </div>
                      )}
                    </td>
                    <td className="px-10 py-8 text-right">
                      {editingUser === u._id ? (
                        <div className="flex gap-2 justify-end">
                           <button onClick={() => handleUpdateUser(u._id)} className="p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/20"><Save size={18} /></button>
                           <button onClick={() => setEditingUser(null)} className="p-3 bg-gray-100 text-gray-500 rounded-xl"><X size={18} /></button>
                        </div>
                      ) : (
                        <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(u)} className="p-3 text-gray-400 hover:bg-gray-100 rounded-xl transition"><Edit size={18} /></button>
                          <button onClick={() => handleDeleteUser(u._id)} className="p-3 text-red-400 hover:bg-red-50 rounded-xl transition"><Trash2 size={18} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ icon: Icon, label, val, color, isPrimary }) => (
  <div className={`${isPrimary ? 'bg-primary text-white shadow-primary/30' : 'bg-white text-gray-900'} p-10 rounded-[40px] shadow-2xl border border-gray-100 flex flex-col justify-between h-56`}>
    <div className={`${isPrimary ? 'bg-white/20 text-white' : `bg-${color}-50 text-${color}-500`} w-14 h-14 rounded-2xl flex items-center justify-center`}>
      <Icon size={24} />
    </div>
    <div>
      <span className={`${isPrimary ? 'text-primary-light' : 'text-gray-400'} text-[10px] font-black uppercase tracking-widest block mb-1`}>{label}</span>
      <span className="text-4xl font-black tracking-tighter">{val}</span>
    </div>
  </div>
);

export default AdminDashboard;