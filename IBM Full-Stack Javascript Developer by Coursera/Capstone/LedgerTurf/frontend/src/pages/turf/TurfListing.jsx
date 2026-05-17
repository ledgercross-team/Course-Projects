import React from 'react';
import { useSearchParams } from 'react-router-dom';
import turfService from '@/services/turfService';
import TurfCard from '@/components/turf/TurfCard';
import Skeleton from '@/components/common/Skeleton';
import MapComponent from '@/components/turf/MapComponent';
import { Search, SlidersHorizontal, Map as MapIcon, Loader2, X, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TurfListing = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [turfs, setTurfs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [showFilters, setShowFilters] = React.useState(false);
  const [viewMode, setViewMode] = React.useState(searchParams.get('view') === 'map' ? 'map' : 'list');

  const fetchTurfs = async () => {
    console.log('Fetching turfs... current state:', { loading, searchParams: searchParams.toString() });
    setLoading(true);
    try {
      const params = Object.fromEntries(searchParams.entries());
      console.log('API Request params:', params);
      const data = await turfService.getTurfs(params);
      console.log('GET /api/turfs response:', data);
      
      if (data && data.success) {
        const turfArray = Array.isArray(data.data) ? data.data : [];
        console.log(`API Success: fetched ${turfArray.length} turfs`);
        setTurfs(turfArray);
      } else {
        console.warn('API Success but data invalid:', data);
        setTurfs([]);
      }
    } catch (error) {
      console.error('API Error details:', error);
      toast.error('Could not load turfs. Please try again.');
      setTurfs([]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTurfs();
  }, [searchParams]);

  const updateFilters = (name, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(name, value);
    } else {
      newParams.delete(name);
    }
    if (name === 'search') newParams.delete('area');
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const safeTurfs = Array.isArray(turfs) ? turfs : [];
  const currentSearchValue = searchParams.get('search') || '';
  const currentArea = searchParams.get('area') || '';
  const availableNow = searchParams.get('availableNow') === 'true';
  const sortNearby = searchParams.get('sort') === 'nearby';

  console.log('Rendering TurfListing:', { 
    viewMode, 
    turfCount: safeTurfs.length, 
    loading
  });

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <div className="bg-white border-b border-gray-100 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search by name or address..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-50 bg-gray-50 focus:ring-2 focus:ring-primary focus:bg-white transition outline-none font-bold"
                onChange={(e) => updateFilters('search', e.target.value)}
                value={currentSearchValue}
              />
            </div>
            
            {/* Active Filter Chips */}
            <div className="flex flex-wrap gap-2">
              {currentArea && (
                <div className="bg-primary/10 border border-primary/20 px-4 py-2 rounded-xl flex items-center gap-2 animate-in zoom-in-95">
                  <MapPin className="text-primary w-4 h-4" />
                  <span className="font-black text-primary text-[10px] uppercase tracking-widest">{currentArea}</span>
                  <button onClick={() => updateFilters('area', '')} className="text-primary hover:text-primary-dark">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {availableNow && (
                <div className="bg-green-50 border border-green-200 px-4 py-2 rounded-xl flex items-center gap-2 animate-in zoom-in-95">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-black text-green-700 text-[10px] uppercase tracking-widest">Available Now</span>
                  <button onClick={() => updateFilters('availableNow', '')} className="text-green-700 hover:text-green-900">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {sortNearby && (
                <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl flex items-center gap-2 animate-in zoom-in-95">
                  <SlidersHorizontal className="text-blue-500 w-4 h-4" />
                  <span className="font-black text-blue-700 text-[10px] uppercase tracking-widest">Smart Discovery</span>
                  <button onClick={() => updateFilters('sort', '')} className="text-blue-700 hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <button 
                onClick={() => {
                  if (navigator.geolocation) {
                    toast.loading('Getting your location...');
                    navigator.geolocation.getCurrentPosition((pos) => {
                      toast.dismiss();
                      updateFilters('lat', pos.coords.latitude);
                      updateFilters('lng', pos.coords.longitude);
                      updateFilters('distance', 10);
                      toast.success('Showing turfs within 10km');
                    }, (err) => {
                      toast.dismiss();
                      toast.error('Location access denied');
                    });
                  }
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white border border-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition"
              >
                <MapPin className="w-5 h-5 text-primary" />
                Nearby
              </button>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-white border border-gray-100 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-700 hover:bg-gray-50 transition"
              >
                <SlidersHorizontal className="w-5 h-5" />
                Filters
              </button>
              <button 
                onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition shadow-lg shadow-primary/20"
              >
                {viewMode === 'list' ? <><MapIcon className="w-5 h-5 mr-2" /> Show Map</> : <><SlidersHorizontal className="w-5 h-5 mr-2" /> Show List</>}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-50 grid grid-cols-2 md:grid-cols-5 gap-6 animate-in slide-in-from-top duration-300">
              <div>
                <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-widest text-[10px]">Sport Type</label>
                <select 
                  className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition font-bold outline-none"
                  onChange={(e) => updateFilters('sportTypes', e.target.value)}
                  value={searchParams.get('sportTypes') || ''}
                >
                  <option value="">All Sports</option>
                  <option value="Football">Football</option>
                  <option value="Cricket">Cricket</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-widest text-[10px]">Price Range (৳)</label>
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    placeholder="Min"
                    className="w-1/2 p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition font-bold outline-none"
                    onChange={(e) => updateFilters('pricePerHour[gte]', e.target.value)}
                    value={searchParams.get('pricePerHour[gte]') || ''}
                  />
                  <input 
                    type="number" 
                    placeholder="Max"
                    className="w-1/2 p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition font-bold outline-none"
                    onChange={(e) => updateFilters('pricePerHour[lte]', e.target.value)}
                    value={searchParams.get('pricePerHour[lte]') || ''}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-widest text-[10px]">Availability Date</label>
                <input 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition font-bold outline-none"
                  onChange={(e) => updateFilters('date', e.target.value)}
                  value={searchParams.get('date') || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-900 mb-2 uppercase tracking-widest text-[10px]">Start Time</label>
                <select 
                  className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:ring-2 focus:ring-primary focus:bg-white transition font-bold outline-none"
                  onChange={(e) => {
                    updateFilters('startTime', e.target.value);
                    if (e.target.value) {
                      const [h, m] = e.target.value.split(':').map(Number);
                      updateFilters('endTime', `${String(h + 1).padStart(2, '0')}:00`);
                    } else {
                      updateFilters('endTime', '');
                    }
                  }}
                  value={searchParams.get('startTime') || ''}
                >
                  <option value="">Any Time</option>
                  {[
                    { v: "06:00", l: "06:00 AM" }, { v: "07:00", l: "07:00 AM" }, { v: "08:00", l: "08:00 AM" },
                    { v: "09:00", l: "09:00 AM" }, { v: "10:00", l: "10:00 AM" }, { v: "11:00", l: "11:00 AM" },
                    { v: "12:00", l: "12:00 PM" }, { v: "13:00", l: "01:00 PM" }, { v: "14:00", l: "02:00 PM" },
                    { v: "15:00", l: "03:00 PM" }, { v: "16:00", l: "04:00 PM" }, { v: "17:00", l: "05:00 PM" },
                    { v: "18:00", l: "06:00 PM" }, { v: "19:00", l: "07:00 PM" }, { v: "20:00", l: "08:00 PM" },
                    { v: "21:00", l: "09:00 PM" }, { v: "22:00", l: "10:00 PM" }
                  ].map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <button 
                  onClick={clearFilters} 
                  className="w-full py-4 bg-red-50 text-red-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-100 transition flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Reset All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        {viewMode === 'map' ? (
          <div className="absolute inset-0 w-full h-[calc(100vh-160px)]">
            <MapComponent turfs={safeTurfs} />
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-32">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-extrabold text-gray-900">
                {loading ? 'Searching...' : `${safeTurfs.length} Turfs Found`}
              </h2>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-[40px] p-4 space-y-4 shadow-sm border border-gray-50">
                    <Skeleton className="h-64 w-full rounded-[30px]" />
                    <div className="p-4 space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex justify-between items-center pt-4">
                        <Skeleton className="h-8 w-1/4" />
                        <Skeleton className="h-10 w-1/3 rounded-xl" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : safeTurfs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {safeTurfs.map((turf) => (
                  <TurfCard key={turf._id} turf={turf} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[40px] p-20 text-center border border-dashed border-gray-200 mt-10">
                <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-12 h-12 text-gray-200" />
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">No turfs found</h3>
                <p className="text-gray-500 max-w-sm mx-auto font-medium text-lg mb-8">We couldn't find any venues matching your current filters. Try widening your search!</p>
                <button onClick={clearFilters} className="bg-primary text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:shadow-2xl transition shadow-xl shadow-primary/20">Clear All Filters</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TurfListing;
