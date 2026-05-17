import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, CheckCircle, ArrowRight, ShieldCheck, Briefcase, Star, Clock, Heart, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import turfService from '@/services/turfService';
import TurfCard from '@/components/turf/TurfCard';

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [featuredTurfs, setFeaturedTurfs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchFeatured = async () => {
      try {
        console.log('Fetching featured turfs for homepage...');
        const res = await turfService.getTurfs({ limit: 3 });
        console.log('Homepage Featured Turfs API Response (raw):', res);
        if (res.success) {
          console.log('Setting Featured Turfs with:', res.data);
          setFeaturedTurfs(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch featured turfs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/turfs?search=${searchQuery}`);
    } else {
      navigate('/turfs');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gray-900 h-[calc(100vh-80px)] min-h-[600px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-60">
          <img 
            src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=2000" 
            alt="Football turf" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl text-white"
          >
            <span className="bg-primary/20 backdrop-blur-md text-primary-light px-6 py-2 rounded-full font-black text-sm uppercase tracking-widest mb-8 inline-block border border-primary/30">
              Dhaka's #1 Turf Network
            </span>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-tight">
              Play Hard, <br /><span className="text-primary">Book Easy.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-300 mb-10 leading-relaxed font-medium max-w-xl">
              Instant booking for Dhaka's top-tier football and cricket turfs. Verified facilities and live availability.
            </p>

            <form onSubmit={handleSearch} className="mt-8 bg-white p-2 rounded-[32px] shadow-2xl flex flex-col md:flex-row gap-2 max-w-2xl border border-gray-100">
              <div className="flex-1 flex items-center px-6">
                <Search className="text-gray-400 w-6 h-6 mr-4" />
                <input 
                  type="text" 
                  placeholder="Where do you want to play? (e.g. Uttara)" 
                  className="w-full py-4 text-gray-900 font-bold outline-none placeholder:text-gray-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                className="bg-primary text-white px-10 py-4 rounded-[24px] font-black text-lg hover:bg-primary-dark transition shadow-lg shadow-primary/20"
              >
                Find Turf
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Featured Turfs Section */}
      <section className="py-32 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <h2 className="text-5xl font-black text-gray-900 tracking-tighter">Featured Venues</h2>
              <p className="text-gray-500 mt-4 text-xl font-medium">Handpicked premium turfs across Dhaka.</p>
            </div>
            <Link to="/turfs" className="bg-gray-50 px-8 py-4 rounded-2xl text-primary font-black flex items-center shadow-sm hover:shadow-md transition group">
              View All <ArrowRight className="ml-2 group-hover:translate-x-1 transition" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredTurfs.map(turf => (
                <TurfCard key={turf._id} turf={turf} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Role Selection Section */}
      <section className="py-24 bg-white relative z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div 
            whileHover={{ y: -10 }}
            className="bg-gray-900 p-12 rounded-[48px] text-white flex flex-col justify-between group shadow-2xl min-h-[400px]"
          >
            <div>
              <div className="bg-primary w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:rotate-12 transition">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-4xl font-black mb-4">I'm a Player</h3>
              <p className="text-gray-400 text-lg mb-10">Find games, book slots, and compete with Dhaka's best teams.</p>
            </div>
            <Link to="/register/player" className="bg-white text-gray-900 py-5 rounded-[24px] font-black text-center text-xl hover:bg-primary hover:text-white transition">Get Your Ticket</Link>
          </motion.div>

          <motion.div 
            whileHover={{ y: -10 }}
            className="bg-primary p-12 rounded-[48px] text-white flex flex-col justify-between group shadow-2xl min-h-[400px]"
          >
            <div>
              <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-8 group-hover:rotate-12 transition">
                <Briefcase className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-4xl font-black mb-4">I'm an Owner</h3>
              <p className="text-primary-light text-lg mb-10">List your facility, manage revenue, and automate your schedule.</p>
            </div>
            <Link to="/register/owner" className="bg-gray-900 text-white py-5 rounded-[24px] font-black text-center text-xl hover:bg-white hover:text-gray-900 transition">List Your Turf</Link>
          </motion.div>
          </div>
          </div>
          </section>

          {/* Popular Areas Section */}
          <section className="py-24 bg-gray-50 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div>
            <h2 className="text-5xl font-black text-gray-900 leading-tight">Explore Areas</h2>
            <p className="text-gray-500 mt-4 text-xl font-medium">The closest turfs in your neighborhood.</p>
          </div>
          <Link to="/turfs?view=map" className="bg-white px-8 py-4 rounded-2xl text-primary font-black flex items-center shadow-sm hover:shadow-md transition">
            View Map <MapPin className="ml-2 w-5 h-5" />
          </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {['Uttara', 'Mirpur', 'Banani', 'Gulshan', 'Dhanmondi', 'Bashundhara', 'Badda', 'Khilkhet', 'Mohammadpur', 'Rampura'].map((area, idx) => (
              <motion.div
                key={area}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
              >
                <Link 
                  to={`/turfs?area=${area}`}
                  className="bg-white p-8 rounded-[32px] text-center shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 border border-gray-50 block group h-full flex flex-col items-center justify-center"
                >
                  <div className="bg-primary/5 w-16 h-16 rounded-[20px] flex items-center justify-center mb-6 group-hover:bg-primary group-hover:rotate-12 transition-all duration-500">
                    <MapPin className="w-8 h-8 text-primary group-hover:text-white transition" />
                  </div>
                  <span className="font-black text-xl text-gray-800 group-hover:text-primary transition">{area}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black text-gray-900 mb-6 tracking-tight">Why Choose LedgerTurf?</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-medium">We've built the most reliable platform for Dhaka's athletes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left">
            {[
              { 
                icon: <Search className="w-10 h-10 text-primary" />, 
                title: "Smart Discovery", 
                desc: "Find the most popular turfs nearby based on your current location and community ratings.",
                link: "/turfs?sort=nearby"
              },
              { 
                icon: <Calendar className="w-10 h-10 text-secondary" />, 
                title: "Live Booking", 
                desc: "Don't wait. See which turfs have open slots right now and secure your game instantly.",
                link: "/turfs?availableNow=true"
              },
              { 
                icon: <Clock className="w-10 h-10 text-green-500" />, 
                title: "Night Booking", 
                desc: "Looking for a late match? Browse venues with premium floodlights open until midnight.",
                link: "/turfs/night"
              }
            ].map((feature, idx) => (
              <Link to={feature.link} key={idx} className="bg-gray-50 p-12 rounded-[48px] hover:shadow-xl transition-all duration-500 group border border-transparent hover:border-gray-100 flex flex-col">
                <div className="inline-flex items-center justify-center p-6 bg-white rounded-3xl shadow-sm mb-8 group-hover:scale-110 transition duration-500 w-fit">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-6">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed text-lg font-medium">{feature.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="bg-primary py-24 relative overflow-hidden shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h2 className="text-6xl font-black text-white mb-8 tracking-tight">Game on?</h2>
          <p className="text-primary-light text-2xl font-medium mb-12 max-w-2xl mx-auto">Dhaka's premier turf booking platform is waiting for you.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-8">
            <Link to="/register/player" className="bg-white text-primary px-12 py-6 rounded-[32px] font-black text-2xl hover:shadow-2xl transition duration-300 transform hover:scale-105 shadow-xl">Get Your Ticket</Link>
            <Link to="/register/owner" className="bg-gray-900 text-white px-12 py-6 rounded-[32px] font-black text-2xl hover:bg-gray-800 transition shadow-xl border border-white/10">Partner with Us</Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
