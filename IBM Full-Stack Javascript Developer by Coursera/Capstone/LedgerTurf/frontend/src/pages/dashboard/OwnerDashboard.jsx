import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import turfService from '@/services/turfService';
import bookingService from '@/services/bookingService';
import { useSelector } from 'react-redux';
import { 
  LayoutGrid, Plus, Clock, Users, DollarSign, Loader2, 
  CheckCircle, XCircle, AlertCircle, Edit, Trash2, Camera, MapPin, Calendar, X, Globe, Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatTime } from '@/utils/formatters';
import FormInput from '@/components/common/FormInput';
import MapPicker from '@/components/common/MapPicker';

const OwnerDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  // Sync state with URL
  const getTabFromPath = (path) => {
    if (path.includes('/reservations')) return 'bookings';
    if (path.includes('/analytics')) return 'analytics';
    if (path.includes('/new-listing')) return 'new-listing';
    return 'turfs';
  };

  const tab = getTabFromPath(location.pathname);

  const [turfs, setTurfs] = React.useState([]);
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  
  // New Listing Form State
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    address: '',
    area: 'Uttara',
    pricePerHour: '',
    openingTime: '06:00',
    closingTime: '23:00',
    sportTypes: ['Football'],
    isIndoor: false,
    images: [''],
    mapLink: '',
    coordinates: [90.4125, 23.8103] // Default Dhaka
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [turfsRes, bookingsRes] = await Promise.all([
        turfService.getTurfs({ owner: user.id }),
        bookingService.getBookings()
      ]);
      console.log('OwnerDashboard - Turfs raw:', turfsRes);
      console.log('OwnerDashboard - Bookings raw:', bookingsRes);
      
      setTurfs(turfsRes.data);
      setBookings(bookingsRes.data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const totalRevenue = bookings
    .filter(b => b.status === 'confirmed' || b.status === 'completed')
    .reduce((acc, b) => acc + (b.totalPrice || 0), 0);

  const getTurfRevenue = (turfId) => {
    return bookings
      .filter(b => (b.turf?._id === turfId || b.turf === turfId) && (b.status === 'confirmed' || b.status === 'completed'))
      .reduce((acc, b) => acc + (b.totalPrice || 0), 0);
  };

  const handleCreateTurf = async (e) => {
    e.preventDefault();
    try {
      if (!formData.name || !formData.address || !formData.pricePerHour) {
        return toast.error('Please fill in all required fields');
      }

      const res = await turfService.createTurf(formData);
      if (res.success) {
        toast.success('Turf listing created! Pending admin approval.');
        navigate('/dashboard/owner/turfs');
        fetchData();
        setFormData({
          name: '', description: '', address: '', area: 'Uttara',
          pricePerHour: '', openingTime: '06:00', closingTime: '23:00',
          sportTypes: ['Football'], isIndoor: false, images: [''],
          mapLink: '', coordinates: [90.4125, 23.8103]
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create turf');
    }
  };

  const handleDeleteTurf = async (id) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await turfService.deleteTurf(id);
      toast.success('Turf deleted');
      fetchData();
    } catch (error) {
      toast.error('Delete failed');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tight">Business Hub</h1>
          <p className="text-gray-500 font-medium mt-2">Manage your facilities and track growth.</p>
        </div>
      </header>

      {tab === 'analytics' && (
        <div className="space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard icon={DollarSign} label="Net Earnings" val={`৳${totalRevenue}`} color="primary" isPrimary />
            <StatCard icon={Users} label="Total Reservations" val={bookings.length} color="blue" />
            <StatCard icon={CheckCircle} label="Active Listings" val={turfs.filter(t => t.status === 'approved').length} color="green" />
          </div>

          <div className="bg-white rounded-[48px] p-10 shadow-2xl border border-gray-100">
            <h2 className="text-2xl font-black text-gray-900 mb-8">Revenue breakdown by venue</h2>
            <div className="space-y-6">
              {turfs.map(t => (
                <div key={t._id} className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow-sm">
                      <img src={t.images?.[0]} className="w-full h-full object-cover" alt="" />
                    </div>
                    <span className="font-black text-gray-900">{t.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-primary">৳{getTurfRevenue(t._id)}</span>
                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Confirmed Revenue</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'turfs' && (
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-gray-900">Your Facilities</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {turfs.map(turf => (
              <div key={turf._id} className="bg-white rounded-[40px] overflow-hidden shadow-2xl border border-gray-100 flex flex-col group">
                <div className="h-48 relative">
                  <img src={turf.images?.[0]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                  <div className="absolute top-4 right-4">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg ${
                      turf.status === 'approved' ? 'bg-green-500 text-white' : 
                      turf.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-yellow-400 text-gray-900'
                    }`}>
                      {turf.status}
                    </span>
                  </div>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black text-gray-900 mb-2">{turf.name}</h3>
                  <p className="text-gray-400 text-sm font-bold mb-6 flex items-center gap-2">
                    <MapPin size={14} className="text-primary" /> {turf.location?.area || turf.address}
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <span className="text-[10px] text-gray-400 font-black uppercase block mb-1">Price</span>
                      <span className="font-black text-gray-900 text-lg">৳{turf.pricePerHour}/hr</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <span className="text-[10px] text-gray-400 font-black uppercase block mb-1">Earnings</span>
                      <span className="font-black text-primary text-lg">৳{getTurfRevenue(turf._id)}</span>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-auto">
                    <button className="flex-1 bg-gray-50 text-gray-900 py-3 rounded-xl font-black text-xs hover:bg-gray-100 transition flex items-center justify-center gap-2"><Edit size={14} /> Edit</button>
                    <button onClick={() => handleDeleteTurf(turf._id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"><Trash2 size={16} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="bg-white rounded-[48px] shadow-2xl border border-gray-100 overflow-hidden">
          <div className="p-10 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-2xl font-black text-gray-900">Recent Reservations</h2>
            <span className="bg-primary text-white px-4 py-1 rounded-full text-xs font-black">{bookings.length} Total</span>
          </div>
          <div className="divide-y divide-gray-50">
            {bookings.length > 0 ? bookings.map(b => (
              <div key={b._id} className="p-8 flex flex-col md:flex-row items-center justify-between hover:bg-gray-50 transition-colors gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xl">{b.user?.name?.[0]}</div>
                  <div>
                    <h4 className="font-black text-gray-900 text-lg">{b.user?.name}</h4>
                    <p className="text-gray-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 mt-1">
                       {b.turf?.name} <span className="text-gray-200">|</span> {new Date(b.date).toLocaleDateString()} @ {formatTime(b.startTime)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                   <div className="text-right">
                    <span className="text-xl font-black text-gray-900 block">৳{b.totalPrice}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paid via Digital</span>
                  </div>
                  <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${b.status === 'confirmed' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {b.status}
                  </span>
                </div>
              </div>
            )) : (
              <div className="p-24 text-center">
                <Calendar className="mx-auto text-gray-200 mb-6" size={64} />
                <h3 className="text-2xl font-black text-gray-900">No bookings yet</h3>
                <p className="text-gray-400 font-medium">Your schedule is currently empty.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'new-listing' && (
        <div className="bg-white rounded-[64px] shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 duration-500">
          <div className="p-12">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tight">New Turf Listing</h2>
                <p className="text-gray-500 font-medium mt-2">Register your facility on LedgerTurf.</p>
              </div>
              <button onClick={() => navigate('/dashboard/owner/turfs')} className="p-4 bg-gray-50 rounded-3xl hover:bg-gray-100 transition"><X size={24} /></button>
            </div>

            <form onSubmit={handleCreateTurf} className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-8">
                  <FormInput 
                    label="Business Name" 
                    placeholder="e.g. Uttara Arena FC" 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})} 
                    required 
                  />
                  <div className="space-y-2">
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Description</label>
                    <textarea 
                      className="w-full p-6 rounded-3xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary outline-none transition font-medium h-32 resize-none"
                      placeholder="Tell players about your facility..."
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      required
                    ></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Area</label>
                      <select 
                        className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary outline-none transition font-bold"
                        value={formData.area}
                        onChange={(e) => setFormData({...formData, area: e.target.value})}
                      >
                        {['Uttara', 'Mirpur', 'Banani', 'Gulshan', 'Dhanmondi', 'Bashundhara', 'Badda', 'Khilkhet', 'Mohammadpur', 'Rampura'].map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <FormInput 
                      label="Rate (৳/hr)" 
                      type="number" 
                      placeholder="3500" 
                      value={formData.pricePerHour} 
                      onChange={(e) => setFormData({...formData, pricePerHour: e.target.value})} 
                      required 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                     <FormInput 
                      label="Opening Time" 
                      type="time" 
                      value={formData.openingTime} 
                      onChange={(e) => setFormData({...formData, openingTime: e.target.value})} 
                    />
                     <FormInput 
                      label="Closing Time" 
                      type="time" 
                      value={formData.closingTime} 
                      onChange={(e) => setFormData({...formData, closingTime: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Detailed Address</label>
                    <textarea 
                      className="w-full p-6 rounded-3xl bg-gray-50 border-2 border-transparent focus:bg-white focus:border-primary outline-none transition font-medium h-24 resize-none"
                      placeholder="e.g. Sector 4, Road 11..." 
                      value={formData.address} 
                      onChange={(e) => setFormData({...formData, address: e.target.value})} 
                      required 
                    ></textarea>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Pin exact location on map</label>
                    <div className="rounded-[32px] overflow-hidden border-4 border-gray-50 shadow-inner">
                      <MapPicker 
                        onLocationSelect={(coords) => setFormData({...formData, coordinates: [coords.lng, coords.lat]})} 
                        initialLocation={{lat: 23.8103, lng: 90.4125}}
                      />
                    </div>
                  </div>
                  <FormInput 
                    label="Image URL" 
                    placeholder="https://images.unsplash.com/..." 
                    value={formData.images[0]} 
                    onChange={(e) => setFormData({...formData, images: [e.target.value]})} 
                    required 
                  />
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100">
                 <button 
                  type="submit"
                  className="w-full bg-primary text-white py-6 rounded-[24px] font-black text-xl hover:bg-primary-dark transition shadow-2xl shadow-primary/20 flex items-center justify-center gap-3"
                >
                  Submit Listing <ArrowRightIcon size={24} />
                </button>
              </div>
            </form>
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

const ArrowRightIcon = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;

export default OwnerDashboard;