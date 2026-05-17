import React from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, ArrowRight } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const center = {
  lat: 23.8103,
  lng: 90.4125
};

const MapComponent = ({ turfs }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const [selectedTurf, setSelectedTurf] = React.useState(null);
  const navigate = useNavigate();

  if (loadError) return <div className="w-full h-full bg-red-50 flex items-center justify-center p-8 text-center"><p className="text-red-500 font-bold">Google Maps failed to load. Please check your API key.</p></div>;
  if (!isLoaded) return <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center font-bold text-gray-400">Initializing Maps...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={12}
      options={{
        styles: [
          { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
        ],
        disableDefaultUI: true,
        zoomControl: true,
      }}
    >
      {turfs.map(turf => (
        <Marker 
          key={turf._id}
          position={{
            lat: turf.location?.coordinates?.[1] || 23.8103,
            lng: turf.location?.coordinates?.[0] || 90.4125
          }}
          onClick={() => setSelectedTurf(turf)}
          icon={{
            url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
          }}
        />
      ))}

      {selectedTurf && (
        <InfoWindow
          position={{
            lat: selectedTurf.location.coordinates[1],
            lng: selectedTurf.location.coordinates[0]
          }}
          onCloseClick={() => setSelectedTurf(null)}
        >
          <div className="p-2 max-w-[240px] animate-in fade-in slide-in-from-bottom-2">
            <img src={selectedTurf.images?.[0]} className="w-full h-28 object-cover rounded-xl mb-3 shadow-sm" alt="" />
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-black text-gray-900 text-sm leading-tight">{selectedTurf.name}</h3>
              <div className="flex items-center text-xs font-black text-yellow-500">
                <Star size={10} className="fill-yellow-500 mr-1" />
                {selectedTurf.averageRating || 'New'}
              </div>
            </div>
            <div className="flex items-center text-gray-500 text-[10px] mb-3">
              <MapPin size={10} className="mr-1 text-primary" />
              <span className="truncate">{selectedTurf.location.area}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-50">
              <span className="font-black text-primary text-xs">৳{selectedTurf.pricePerHour}/hr</span>
              <button 
                onClick={() => navigate(`/turfs/${selectedTurf._id}`)}
                className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 hover:bg-primary transition"
              >
                Book <ArrowRight size={10} />
              </button>
            </div>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export default React.memo(MapComponent);
