import React from 'react';
import { Link } from 'react-router-dom';
import bookingService from '@/services/bookingService';
import { useSelector } from 'react-redux';
import { 
  Calendar, Clock, MapPin, Tag, Trash2, Loader2, 
  AlertCircle, ChevronRight, Map as MapIcon, Phone, DollarSign, Star, Mail
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { formatTime } from '@/utils/formatters';

const UserDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [bookings, setBookings] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedBooking, setSelectedBooking] = React.useState(null);

  const fetchBookings = async () => {
    try {
      const res = await bookingService.getBookings();
      console.log('UserDashboard - Bookings raw:', res);
      if (res && res.success) {
        setBookings(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await bookingService.cancelBooking(id);
      toast.success('Booking cancelled');
      fetchBookings();
      setSelectedBooking(null);
    } catch (error) {
      toast.error('Could not cancel booking');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-40"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <header>
        <h1 className="text-5xl font-black text-gray-900 tracking-tight">
          {user?.role === 'superAdmin' ? 'Player Records' : `Hey, ${user?.name.split(' ')[0]}!`}
        </h1>
        <p className="text-gray-500 font-medium mt-2">
          {user?.role === 'superAdmin' ? 'System-wide player activity.' : 'Your upcoming matches and history.'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Bookings List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-gray-900 mb-8">My Schedule</h2>
          {bookings.length > 0 ? bookings.map((booking) => (
            <div 
              key={booking._id} 
              onClick={() => setSelectedBooking(booking)}
              className={`
                bg-white p-8 rounded-[40px] shadow-2xl border transition-all cursor-pointer group
                ${selectedBooking?._id === booking._id ? 'border-primary' : 'border-gray-100 hover:border-primary/30'}
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="bg-gray-50 p-4 rounded-3xl group-hover:bg-primary/10 transition-colors text-primary">
                    <Calendar size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 mb-1">{booking.turf?.name || 'Deleted Turf'}</h3>
                    <div className="flex gap-4 text-sm font-bold text-gray-400">
                      <span className="flex items-center gap-1"><MapPin size={14} className="text-primary" /> {booking.turf?.location?.area || 'N/A'}</span>
                      <span className="flex items-center gap-1 text-gray-900"><Clock size={14} className="text-primary" /> {formatTime(booking.startTime)}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight className={`text-gray-300 transition-transform ${selectedBooking?._id === booking._id ? 'rotate-90 text-primary' : 'group-hover:translate-x-1'}`} />
              </div>
            </div>
          )) : (
            <div className="bg-white rounded-[48px] p-20 text-center border-2 border-dashed border-gray-100">
              <AlertCircle className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-gray-400 font-bold">No matches booked yet.</p>
            </div>
          )}
        </div>

        {/* Booking Detail View */}
        <div className="lg:col-span-1">
          {selectedBooking ? (
            <div className="bg-white rounded-[48px] p-10 shadow-2xl border border-gray-100 sticky top-12 animate-in slide-in-from-right-4 duration-500">
              <div className="aspect-square rounded-[32px] overflow-hidden mb-8 shadow-inner">
                <img src={selectedBooking.turf?.images?.[0]} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-3xl font-black text-gray-900 leading-tight">{selectedBooking.turf?.name}</h3>
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${selectedBooking.status === 'confirmed' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                      {selectedBooking.status}
                    </span>
                  </div>
                  <p className="text-gray-400 font-bold flex items-center gap-2 text-sm"><MapPin size={14} /> {selectedBooking.turf?.address}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-6 rounded-3xl">
                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Date</span>
                    <span className="font-black text-gray-900">{new Date(selectedBooking.date).toLocaleDateString()}</span>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-3xl">
                    <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Time</span>
                    <span className="font-black text-gray-900">{formatTime(selectedBooking.startTime)}</span>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-gray-50">
                  <div className="flex items-center gap-3 text-gray-900 font-bold">
                    <div className="bg-primary/10 p-2 rounded-lg text-primary"><Phone size={16} /></div>
                    <span>{selectedBooking.turf?.owner?.phone || '01XXXXXXXXX'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-900 font-bold">
                    <div className="bg-secondary/10 p-2 rounded-lg text-secondary"><Mail size={16} /></div>
                    <span>{selectedBooking.turf?.owner?.email || 'Contact Owner'}</span>
                  </div>
                </div>

                <div className="pt-6">
                  <Link 
                    to={`/turfs/${selectedBooking.turf?._id}`}
                    className="w-full py-4 bg-gray-50 text-gray-900 rounded-2xl font-black hover:bg-gray-100 transition flex items-center justify-center gap-2 text-sm"
                  >
                    <Star size={16} className="text-yellow-500 fill-yellow-500" /> Rate & Review Turf
                  </Link>
                </div>

                {selectedBooking.status === 'confirmed' && (
                  <button 
                    onClick={() => handleCancel(selectedBooking._id)}
                    className="w-full py-5 bg-red-50 text-red-500 rounded-[24px] font-black hover:bg-red-100 transition shadow-sm flex items-center justify-center gap-2"
                  >
                    <Trash2 size={20} /> Cancel Match
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-100/50 rounded-[48px] p-12 text-center border-2 border-dashed border-gray-200 h-96 flex flex-col justify-center sticky top-12">
              <Tag className="mx-auto text-gray-300 mb-4" size={40} />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Select a booking to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;
