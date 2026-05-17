import React from 'react';
import { GoogleMap, useJsApiLoader, Marker, StandaloneSearchBox } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '400px'
};

const defaultCenter = {
  lat: 23.8103,
  lng: 90.4125
};

const MapPicker = ({ onLocationSelect, initialLocation }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ['places']
  });

  const [marker, setMarker] = React.useState(initialLocation || defaultCenter);
  const [searchBox, setSearchBox] = React.useState(null);

  const onMarkerDragEnd = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMarker({ lat, lng });
    onLocationSelect({ lat, lng });
  };

  const onLoad = (ref) => setSearchBox(ref);

  const onPlacesChanged = () => {
    const places = searchBox.getPlaces();
    if (places && places.length > 0) {
      const place = places[0];
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      setMarker({ lat, lng });
      onLocationSelect({ lat, lng });
    }
  };

  if (!isLoaded) return <div className="h-[400px] w-full bg-gray-100 rounded-[32px] animate-pulse flex items-center justify-center font-black text-gray-400">Loading Google Maps...</div>;

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={marker}
        zoom={15}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          styles: [
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
          ]
        }}
      >
        <StandaloneSearchBox onLoad={onLoad} onPlacesChanged={onPlacesChanged}>
          <input
            type="text"
            placeholder="Search for your location (e.g. Uttara Sector 4)"
            className="absolute left-1/2 -translate-x-1/2 top-4 w-3/4 p-4 rounded-2xl shadow-2xl border-2 border-primary/20 outline-none focus:border-primary font-bold z-10"
          />
        </StandaloneSearchBox>
        <Marker 
          position={marker} 
          draggable={true} 
          onDragEnd={onMarkerDragEnd}
          animation={window.google.maps.Animation.DROP}
        />
      </GoogleMap>
      <div className="bg-gray-900 text-white p-4 text-center text-xs font-black uppercase tracking-widest">
        Coordinates: {marker.lat.toFixed(6)}, {marker.lng.toFixed(6)}
      </div>
    </div>
  );
};

export default React.memo(MapPicker);
