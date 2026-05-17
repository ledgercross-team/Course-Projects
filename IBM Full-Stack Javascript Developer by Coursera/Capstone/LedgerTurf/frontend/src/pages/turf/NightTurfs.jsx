import React from 'react';
import turfService from '@/services/turfService';
import TurfCard from '@/components/turf/TurfCard';
import Skeleton from '@/components/common/Skeleton';
import { Moon, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NightTurfs = () => {
  const [turfs, setTurfs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const navigate = useNavigate();

  const fetchNightTurfs = async () => {
    setLoading(true);
    try {
      // Fetch all and filter specifically for the 3 midnight turfs by name 
      // or by closing time logic that we know includes them (06:00 AM)
      const res = await turfService.getTurfs({ limit: 100 });
      console.log('GET /api/turfs response (NightTurfs):', res);
      if (res && res.success) {
        const data = Array.isArray(res.data) ? res.data : [];
        const filtered = data.filter(t => 
          t.closingTime === '06:00' || 
          ['Midnight Arena Dhaka', 'Night Owl Futsal Zone', 'Floodlight Football Hub'].includes(t.name)
        );
        setTurfs(filtered);
      }
    } catch (error) {
      console.error('Error fetching night turfs:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchNightTurfs();
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      <div className="bg-gray-900 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=2000" 
            className="w-full h-full object-cover"
            alt="" 
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center text-primary-light mb-8 font-black hover:text-white transition-all group"
          >
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition" /> Back to Home
          </button>
          <div className="flex items-center gap-6 mb-4">
            <div className="bg-primary/20 p-4 rounded-3xl backdrop-blur-xl border border-primary/30">
              <Moon className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter">Late Night <span className="text-primary italic">Turf Booking</span></h1>
          </div>
          <p className="text-xl text-gray-400 max-w-2xl font-medium">Premium venues in Dhaka open through the night until 6:00 AM. Equipped with elite floodlighting.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-[40px] p-4 space-y-4 shadow-xl border border-gray-100">
                <Skeleton className="h-64 w-full rounded-[30px]" />
                <div className="p-4 space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : turfs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {turfs.map(turf => (
              <TurfCard key={turf._id} turf={turf} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-[48px] p-24 text-center shadow-2xl border border-gray-100">
            <Moon className="w-20 h-20 text-gray-200 mx-auto mb-6" />
            <h3 className="text-3xl font-black text-gray-900 mb-4">No midnight sessions found</h3>
            <p className="text-gray-500 font-medium text-lg max-w-md mx-auto mb-10">All late-night venues are currently booked or under maintenance. Check back later for evening slots!</p>
            <button onClick={() => navigate('/turfs')} className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-primary transition shadow-xl">Explore All Venues</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NightTurfs;