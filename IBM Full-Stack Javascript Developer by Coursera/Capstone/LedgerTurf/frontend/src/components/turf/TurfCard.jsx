import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Trophy, Users, Star, Clock } from 'lucide-react';
import { formatTime } from '@/utils/formatters';

const TurfCard = ({ turf }) => {
  const [imgSrc, setImgSrc] = React.useState(turf.images?.[0] || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800');

  const handleImageError = () => {
    setImgSrc('https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800');
  };

  const openMap = (e) => {
    e.preventDefault();
    if (turf.mapLink) {
      window.open(turf.mapLink, '_blank');
    } else {
      const [lng, lat] = turf.location.coordinates;
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    }
  };

  return (
    <div className="bg-white rounded-[40px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 group relative">
      <div className="relative h-64 overflow-hidden">
        <img 
          src={imgSrc} 
          alt={turf.name}
          onError={handleImageError}
          className="w-full h-full object-cover group-hover:scale-110 transition duration-700"
        />
        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur px-4 py-2 rounded-2xl text-xs font-black text-gray-900 shadow-xl flex items-center gap-2">
          <Star size={14} className="text-yellow-500 fill-yellow-500" />
          {turf.averageRating || 'New'}
        </div>
        <div className="absolute bottom-6 left-6 right-6 flex gap-2">
          {turf.sportTypes?.map((sport) => (
            <span key={sport} className="bg-primary text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
              {sport}
            </span>
          ))}
        </div>
      </div>
      <div className="p-8">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-2xl font-black text-gray-900 truncate group-hover:text-primary transition leading-tight">{turf.name}</h3>
        </div>
        <div className="flex items-center text-gray-500 text-sm mb-6 font-bold">
          <MapPin size={16} className="mr-2 text-primary" />
          <span className="truncate">{turf.location?.area || turf.address}</span>
        </div>
        
        <div className="flex items-center gap-6 mb-8 text-xs font-black text-gray-400 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-primary" />
            {formatTime(turf.openingTime)} - {formatTime(turf.closingTime)}
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-50">
          <div>
            <span className="text-[10px] text-gray-400 block mb-1 font-black uppercase tracking-widest">Rate / Hour</span>
            <span className="text-2xl font-black text-gray-900 tracking-tighter">৳{turf.pricePerHour}</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={openMap}
              className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-primary/10 hover:text-primary transition"
              title="View on Map"
            >
              <MapPin size={20} />
            </button>
            <Link 
              to={`/turfs/${turf._id}`}
              className="bg-gray-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-primary transition shadow-xl shadow-gray-200 active:scale-95"
            >
              Book Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TurfCard;
