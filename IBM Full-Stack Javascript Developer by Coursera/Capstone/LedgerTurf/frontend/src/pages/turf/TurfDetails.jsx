import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import turfService from '@/services/turfService';
import bookingService from '@/services/bookingService';
import { toast } from 'react-hot-toast';
import { MapPin, Info, Calendar, Clock, CheckCircle, Loader2, ArrowLeft, Star, Heart, Phone, Mail, ArrowRight } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import PaymentModal from '@/components/booking/PaymentModal';
import api from '@/services/api';
import { formatTime } from '@/utils/formatters';
import MapComponent from '@/components/turf/MapComponent';

const TurfDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const [turf, setTurf] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [imgSrc, setImgSrc] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [unavailableSlots, setUnavailableSlots] = React.useState([]);
  const [selectedSlot, setSelectedSlot] = React.useState(null);
  const [bookingLoading, setBookingLoading] = React.useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [reviews, setReviews] = React.useState([]);
  const [userReview, setUserReview] = React.useState({ rating: 5, comment: '' });

  const timeSlots = [
    { v: "06:00", l: "06:00 AM" }, { v: "07:00", l: "07:00 AM" }, { v: "08:00", l: "08:00 AM" },
    { v: "09:00", l: "09:00 AM" }, { v: "10:00", l: "10:00 AM" }, { v: "11:00", l: "11:00 AM" },
    { v: "12:00", l: "12:00 PM" }, { v: "13:00", l: "01:00 PM" }, { v: "14:00", l: "02:00 PM" },
    { v: "15:00", l: "03:00 PM" }, { v: "16:00", l: "04:00 PM" }, { v: "17:00", l: "05:00 PM" },
    { v: "18:00", l: "06:00 PM" }, { v: "19:00", l: "07:00 PM" }, { v: "20:00", l: "08:00 PM" },
    { v: "21:00", l: "09:00 PM" }, { v: "22:00", l: "10:00 PM" }
  ];

  const fetchDetails = async () => {
    setLoading(true);
    try {
      console.log('Fetching details for turf ID:', id);
      const res = await turfService.getTurf(id);
      console.log('Turf details API Response:', res);
      if (res.success) {
        setTurf(res.data);
        setImgSrc(res.data.images?.[0] || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200');
      }
    } catch (error) {
      console.error('Error fetching turf details:', error);
      toast.error('Turf not found');
      navigate('/turfs');
    } finally {
      setLoading(false);
    }
  };

  const handleImageError = () => {
    setImgSrc('https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200');
  };

  const openDirections = (e) => {
    e.preventDefault();
    if (turf.mapLink) {
      window.open(turf.mapLink, '_blank');
    } else {
      const [lng, lat] = turf.location.coordinates;
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  const fetchAvailability = async () => {
    if (!id || !selectedDate) return;
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await bookingService.getUnavailableSlots(id, dateStr);
      setUnavailableSlots(res.data.map(b => b.startTime));
    } catch (error) {
      console.error('Could not fetch availability', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/reviews/turf/${id}`);
      setReviews(res.data.data);
    } catch (error) {
      console.error('Could not fetch reviews');
    }
  };

  React.useEffect(() => {
    fetchDetails();
    fetchReviews();
  }, [id]);

  React.useEffect(() => {
    if (turf) fetchAvailability();
  }, [turf, selectedDate]);

  const handleBookingClick = () => {
    if (!user) {
      toast.error('Please login to book a turf');
      return navigate('/login', { state: { from: { pathname: `/turfs/${id}` } } });
    }
    if (!selectedSlot) return toast.error('Please select a time slot');
    setIsPaymentOpen(true);
  };

  const onPaymentConfirm = async () => {
    setIsPaymentOpen(false);
    setBookingLoading(true);
    try {
      const startTime = selectedSlot;
      const [h, m] = startTime.split(':').map(Number);
      const endTime = `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      
      const res = await bookingService.createBooking({
        turf: id,
        date: selectedDate.toISOString().split('T')[0],
        startTime,
        endTime
      });

      if (res.success) {
        toast.success('Booking Successful! ✅');
        navigate('/dashboard/player');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/reviews/turf/${id}`, userReview);
      toast.success('Review submitted!');
      fetchReviews();
      fetchDetails();
      setUserReview({ rating: 5, comment: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit review');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-40">
      <Loader2 className="w-12 h-12 text-primary animate-spin" />
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-500 hover:text-primary mb-10 font-black transition-all group"
        >
          <ArrowLeft className="w-6 h-6 mr-2 group-hover:-translate-x-1 transition" /> Back to Search
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          <div className="lg:col-span-2 space-y-12">
            {/* Header Card */}
            <div className="bg-white rounded-[64px] overflow-hidden shadow-2xl border border-gray-100">
              <div className="aspect-[21/9] relative">
                <img 
                  src={imgSrc} 
                  alt={turf.name}
                  onError={handleImageError}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-8 left-8 flex gap-4">
                  {turf.sportTypes?.map(s => (
                    <span key={s} className="bg-primary/90 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-2xl">{s}</span>
                  ))}
                </div>
                <button className="absolute top-8 right-8 bg-white/20 backdrop-blur-xl p-4 rounded-3xl hover:bg-red-500 transition-all hover:text-white text-white shadow-2xl">
                  <Heart size={24} />
                </button>
              </div>
              
              <div className="p-12 md:p-16">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                  <div>
                    <h1 className="text-5xl font-black text-gray-900 mb-4 tracking-tighter leading-tight">{turf.name}</h1>
                    <div className="flex items-center text-gray-400 text-lg font-bold">
                      <MapPin className="w-6 h-6 mr-2 text-primary" />
                      {turf.address}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 bg-yellow-50 px-6 py-3 rounded-3xl border border-yellow-100">
                      <Star size={24} className="text-yellow-500 fill-yellow-500" />
                      <span className="text-2xl font-black text-yellow-700">{turf.averageRating || 'New'}</span>
                    </div>
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest mr-2">Player Rating</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                   <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 text-center">
                    <Clock className="w-8 h-8 text-primary mx-auto mb-4" />
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Operating Hours</span>
                    <span className="text-lg font-black text-gray-900">{formatTime(turf.openingTime)} - {formatTime(turf.closingTime)}</span>
                  </div>
                  <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-4" />
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Status</span>
                    <span className="text-lg font-black text-gray-900">Verified Facility</span>
                  </div>
                  <div className="bg-gray-50 p-8 rounded-[40px] border border-gray-100 text-center">
                    <Info className="w-8 h-8 text-secondary mx-auto mb-4" />
                    <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Turf Type</span>
                    <span className="text-lg font-black text-gray-900">{turf.isIndoor ? 'Indoor' : 'Outdoor'}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">About the facility</h3>
                  <p className="text-gray-500 text-lg leading-relaxed font-medium">{turf.description}</p>
                </div>

                {/* Location Map */}
                <div className="space-y-6 pt-12 border-t border-gray-50">
                  <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Location & Directions</h3>
                    <button 
                      onClick={openDirections}
                      className="text-primary font-black text-sm hover:underline flex items-center gap-2"
                    >
                      Get Directions <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="h-96 rounded-[48px] overflow-hidden border-4 border-gray-50 shadow-inner bg-gray-100">
                    <MapComponent turfs={[turf]} />
                  </div>
                </div>

                {/* Owner Info for Admins/Players */}
                <div className="mt-12 pt-12 border-t border-gray-50 flex flex-wrap gap-12">
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-4 rounded-2xl"><Phone className="text-primary" /></div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-black uppercase block">Call to Inquire</span>
                      <span className="font-black text-gray-900">{turf.owner?.phone || '01XXXXXXXXX'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-secondary/10 p-4 rounded-2xl"><Mail className="text-secondary" /></div>
                    <div>
                      <span className="text-[10px] text-gray-400 font-black uppercase block">Support Email</span>
                      <span className="font-black text-gray-900">{turf.owner?.email || 'support@ledgerturf.com'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="bg-white rounded-[64px] p-12 md:p-16 shadow-2xl border border-gray-100">
              <h2 className="text-4xl font-black text-gray-900 mb-12 tracking-tight flex items-center gap-4">
                Recent Reviews
                <span className="bg-gray-100 px-4 py-1 rounded-2xl text-lg text-gray-500">{reviews.length}</span>
              </h2>

              <div className="space-y-12 mb-16">
                {reviews.length > 0 ? (
                  reviews.map((rev) => (
                    <div key={rev._id} className="flex gap-8 group">
                      <div className="bg-primary/10 w-16 h-16 rounded-3xl flex items-center justify-center font-black text-primary text-xl flex-shrink-0">
                        {rev.user?.name?.[0] || 'P'}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-xl font-black text-gray-900">{rev.user?.name}</h4>
                          <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} size={14} className={`${i < rev.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-500 text-lg leading-relaxed italic">"{rev.comment}"</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
                    <Star className="mx-auto text-gray-200 mb-4" size={48} />
                    <p className="text-gray-400 font-bold italic text-lg">No reviews yet. Be the first to play!</p>
                  </div>
                )}
              </div>

              {user && user.role === 'player' && (
                <div className="bg-gray-900 p-12 rounded-[48px] text-white">
                  <h3 className="text-3xl font-black mb-8 leading-tight">Rate your game</h3>
                  <form onSubmit={handleReviewSubmit} className="space-y-8">
                    <div className="flex gap-4">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setUserReview({ ...userReview, rating: num })}
                          className={`w-14 h-14 rounded-2xl transition-all flex items-center justify-center ${userReview.rating >= num ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'}`}
                        >
                          <Star className={`${userReview.rating >= num ? 'fill-white' : ''}`} size={24} />
                        </button>
                      ))}
                    </div>
                    <textarea
                      required
                      value={userReview.comment}
                      onChange={(e) => setUserReview({ ...userReview, comment: e.target.value })}
                      className="w-full p-8 rounded-[32px] bg-white/5 border border-white/10 focus:border-primary outline-none transition font-medium h-40 resize-none text-white text-lg"
                      placeholder="Was the grass perfect? How was the lighting?"
                    ></textarea>
                    <button type="submit" className="bg-primary text-white px-10 py-5 rounded-2xl font-black text-xl hover:bg-primary-dark transition shadow-2xl shadow-primary/20">Post Review</button>
                  </form>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-[56px] p-10 shadow-2xl border border-gray-100 sticky top-28 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-end mb-10">
                  <span className="text-gray-400 text-xs font-black uppercase tracking-widest">Rate / Hour</span>
                  <span className="text-4xl font-black text-gray-900 tracking-tighter">৳{turf.pricePerHour}</span>
                </div>

                <div className="space-y-8">
                  <div className="space-y-4">
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="text-primary w-4 h-4" /> Pick Date
                    </label>
                    <DatePicker 
                      selected={selectedDate} 
                      onChange={(date) => setSelectedDate(date)}
                      minDate={new Date()}
                      className="w-full p-5 bg-gray-50 border-2 border-gray-50 rounded-2xl focus:bg-white focus:border-primary font-black text-gray-800 cursor-pointer transition outline-none"
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                      <Clock className="text-primary w-4 h-4" /> Select Slot
                    </label>
                    <div className="max-h-[320px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-primary/20 transition-colors">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {timeSlots.map(slot => {
                          const isBooked = unavailableSlots.includes(slot.v);
                          
                          // Check if slot has already passed for today (BD Time UTC+6)
                          const now = new Date();
                          const bdTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (6 * 3600000));
                          const isToday = selectedDate.toDateString() === bdTime.toDateString();
                          const [slotH, slotM] = slot.v.split(':').map(Number);
                          const isPast = isToday && (slotH < bdTime.getHours() || (slotH === bdTime.getHours() && slotM <= bdTime.getMinutes()));
                          
                          const isDisabled = isBooked || isPast;
                          const isSelected = selectedSlot === slot.v;

                          return (
                            <button
                              key={slot.v}
                              disabled={isDisabled}
                              onClick={() => !isDisabled && setSelectedSlot(slot.v)}
                              className={`py-4 rounded-2xl text-[10px] font-black transition-all border-2 uppercase tracking-tighter ${
                                isDisabled 
                                  ? 'bg-red-50 text-red-300 border-red-100 cursor-not-allowed opacity-60' 
                                  : isSelected 
                                    ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' 
                                    : 'bg-white text-gray-600 border-gray-100 hover:border-primary/50'
                              }`}
                            >
                              {slot.l}
                              {isBooked && <span className="block text-[8px] mt-1 text-red-400">Booked</span>}
                              {isPast && <span className="block text-[8px] mt-1 text-red-400">Passed</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-100">
                    <div className="flex justify-between mb-8 pb-4 border-b border-gray-50">
                      <span className="text-gray-900 font-black text-xl uppercase tracking-tighter">Total</span>
                      <span className="text-primary font-black text-3xl tracking-tighter">৳{turf.pricePerHour}</span>
                    </div>

                    <button 
                      disabled={bookingLoading}
                      onClick={handleBookingClick}
                      className="w-full py-6 bg-gray-900 text-white rounded-[24px] font-black text-xl hover:bg-primary transition-all duration-300 shadow-2xl flex items-center justify-center group"
                    >
                      {bookingLoading ? <Loader2 className="animate-spin" /> : 'Confirm Booking'}
                    </button>
                    <p className="mt-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest leading-loose italic">Secure instant payment demonstration enabled.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <PaymentModal 
        isOpen={isPaymentOpen} 
        onClose={() => setIsPaymentOpen(false)} 
        onConfirm={onPaymentConfirm} 
        amount={turf?.pricePerHour || 0} 
      />
    </div>
  );
};

export default TurfDetails;