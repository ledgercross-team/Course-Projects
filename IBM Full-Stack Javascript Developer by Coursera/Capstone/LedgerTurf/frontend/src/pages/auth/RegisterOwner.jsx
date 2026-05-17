import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register, reset } from '@/store/authSlice';
import turfService from '@/services/turfService';
import { toast } from 'react-hot-toast';
import { Mail, Lock, User as UserIcon, Phone, MapPin, Briefcase, Clock, DollarSign, Loader2, ArrowRight, Image as ImageIcon, X, CheckCircle } from 'lucide-react';
import FormInput from '@/components/common/FormInput';
import MapPicker from '@/components/common/MapPicker';
import { validatePhone } from '@/utils/formatters';

const RegisterOwner = () => {
  const [formData, setFormData] = React.useState({
    name: '', email: '', phone: '', password: '', 
    turfName: '', turfAddress: '', area: 'Uttara', sportTypes: 'Football',
    openingTime: '06:00', closingTime: '23:00', pricePerHour: '', description: ''
  });

  const [location, setLocation] = React.useState({ lat: 23.8103, lng: 90.4125 });
  const [images, setImages] = React.useState([]);
  const [previews, setPreviews] = React.useState([]);
  const [isTurfCreating, setIsTurfCreating] = React.useState(false);
  const [errors, setErrors] = React.useState({});

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isLoading, isError, message } = useSelector((state) => state.auth);

  React.useEffect(() => {
    if (isError) {
      toast.error(message);
      dispatch(reset());
    }
  }, [isError, message, dispatch]);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    const filePreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(filePreviews);
  };

  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.name) newErrors.name = "Owner name is required";
    if (!validatePhone(formData.phone)) newErrors.phone = "Invalid Bangladeshi phone number";
    if (!formData.turfName) newErrors.turfName = "Turf name is required";
    if (!formData.pricePerHour) newErrors.pricePerHour = "Price is required";
    if (images.length === 0) newErrors.images = "At least one image is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      // 1. Register Account
      const authData = { 
        name: formData.name, 
        email: formData.email, 
        phone: formData.phone.trim(), 
        password: formData.password, 
        role: 'turfOwner' 
      };
      
      const res = await dispatch(register(authData)).unwrap();

      if (res.token) {
        setIsTurfCreating(true);
        // 2. Create Turf Business
        const turfData = new FormData();
        turfData.append('name', formData.turfName);
        turfData.append('address', formData.turfAddress);
        turfData.append('area', formData.area);
        turfData.append('sportTypes', formData.sportTypes);
        turfData.append('pricePerHour', formData.pricePerHour);
        turfData.append('description', formData.description);
        turfData.append('openingTime', formData.openingTime);
        turfData.append('closingTime', formData.closingTime);
        turfData.append('coordinates', JSON.stringify([location.lng, location.lat]));
        
        images.forEach(img => turfData.append('images', img));

        await turfService.createTurf(turfData);
        toast.success('Registration successful! Redirecting...');
        navigate('/dashboard/owner');
      }
    } catch (err) {
      toast.error(err || 'Registration failed');
    } finally {
      setIsTurfCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-700">
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tight mb-4">Partner with <span className="text-primary">LedgerTurf</span></h1>
          <p className="text-xl text-gray-500 font-medium">Join the premier network for football and cricket facilities in Dhaka.</p>
        </div>

        <div className="bg-white rounded-[64px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col lg:flex-row animate-in fade-in zoom-in-95 duration-700">
          {/* Sidebar Info */}
          <div className="lg:w-[320px] bg-gray-900 p-12 text-white flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10">
              <div className="bg-primary w-16 h-16 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-primary/20">
                <Briefcase size={32} />
              </div>
              <h2 className="text-3xl font-black mb-8 leading-tight">Grow Your Business.</h2>
              <ul className="space-y-8">
                <li className="flex items-start gap-4">
                  <div className="mt-1 bg-white/10 p-1 rounded-lg"><Clock size={16} /></div>
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-widest text-primary">Automated</h4>
                    <p className="text-gray-400 text-sm mt-1">24/7 online booking management.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="mt-1 bg-white/10 p-1 rounded-lg"><DollarSign size={16} /></div>
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-widest text-primary">Analytics</h4>
                    <p className="text-gray-400 text-sm mt-1">Track revenue and performance stats.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="mt-12 pt-12 border-t border-white/10 relative z-10">
              <p className="text-sm font-medium text-gray-400 italic">"LedgerTurf helped us increase our evening slot bookings by 40% in just two months."</p>
              <p className="mt-4 font-bold text-white">— Uttara Arena Owner</p>
            </div>
          </div>

          {/* Registration Form */}
          <form className="flex-1 p-8 md:p-16 lg:p-20 space-y-16" onSubmit={onSubmit}>
            {/* Step 1: Owner Profile */}
            <section className="space-y-8">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center font-black text-primary text-xs">1</div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-wider">Owner Profile</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormInput label="Full Name" name="name" icon={UserIcon} placeholder="John Doe" value={formData.name} onChange={onChange} error={errors.name} autoComplete="off" required />
                <FormInput label="Email Address" name="email" type="email" icon={Mail} placeholder="john@example.com" value={formData.email} onChange={onChange} error={errors.email} autoComplete="off" required />
                <FormInput label="Phone Number" name="phone" icon={Phone} placeholder="01XXXXXXXXX" value={formData.phone} onChange={onChange} error={errors.phone} autoComplete="off" required />
                <FormInput label="Account Password" name="password" type="password" icon={Lock} placeholder="Min. 6 chars" value={formData.password} onChange={onChange} error={errors.password} autoComplete="new-password" required />
              </div>
            </section>

            {/* Step 2: Turf Details */}
            <section className="space-y-8">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center font-black text-primary text-xs">2</div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-wider">Turf Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormInput label="Business Name" name="turfName" icon={Briefcase} placeholder="e.g. Uttara Football Club" value={formData.turfName} onChange={onChange} error={errors.turfName} required />
                <FormInput label="Street Address" name="turfAddress" icon={MapPin} placeholder="e.g. Sector 4, Road 12" value={formData.turfAddress} onChange={onChange} required />
                <div className="space-y-2">
                  <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Sport Types</label>
                  <select name="sportTypes" onChange={onChange} className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-primary outline-none transition font-bold">
                    <option value="Football">Football Only</option>
                    <option value="Cricket">Cricket Only</option>
                    <option value="Both">Both (Multi-purpose)</option>
                  </select>
                </div>
                <FormInput label="Price Per Hour (৳)" name="pricePerHour" type="number" icon={DollarSign} placeholder="e.g. 1500" value={formData.pricePerHour} onChange={onChange} error={errors.pricePerHour} required />
                <div className="relative">
                  <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Opening Time</label>
                  <input name="openingTime" type="time" onChange={onChange} value={formData.openingTime} className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-primary outline-none transition font-bold" />
                </div>
                <div className="relative">
                  <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-widest">Closing Time</label>
                  <input name="closingTime" type="time" onChange={onChange} value={formData.closingTime} className="w-full p-4 rounded-2xl bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-primary outline-none transition font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-black text-gray-700 uppercase tracking-widest">Description & Amenities</label>
                <textarea name="description" onChange={onChange} value={formData.description} className="w-full p-6 rounded-[32px] bg-gray-50 border-2 border-gray-50 focus:bg-white focus:border-primary outline-none transition font-bold h-40 resize-none" placeholder="Tell players about your facility..."></textarea>
              </div>
            </section>

            {/* Step 3: Location Picker */}
            <section className="space-y-8">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center font-black text-primary text-xs">3</div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-wider">Map Location</h3>
              </div>
              <p className="text-sm text-gray-500 font-bold">Drag the map or click to place a pin exactly where your turf is located.</p>
              <div className="rounded-[32px] overflow-hidden border-4 border-gray-50 shadow-inner">
                <MapPicker onLocationSelect={(loc) => setLocation(loc)} initialLocation={location} />
              </div>
            </section>

            {/* Step 4: Images */}
            <section className="space-y-8">
              <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
                <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center font-black text-primary text-xs">4</div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-wider">Facility Gallery</h3>
              </div>
              <div className={`relative border-4 border-dashed rounded-[48px] p-12 text-center transition-all ${errors.images ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-gray-50 hover:border-primary/30'}`}>
                <ImageIcon className={`w-16 h-16 mx-auto mb-4 ${errors.images ? 'text-red-300' : 'text-gray-300'}`} />
                <p className={`text-lg font-black ${errors.images ? 'text-red-600' : 'text-gray-900'}`}>Upload Turf Photos</p>
                <p className="text-sm text-gray-400 mt-2 font-bold uppercase tracking-widest">Max 5 images (JPG, PNG)</p>
                <input type="file" multiple onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
              </div>
              {previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {previews.map((url, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-gray-100 shadow-sm">
                      <img src={url} className="w-full h-full object-cover" alt="" />
                      <button 
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="pt-10 border-t border-gray-100">
              <button 
                type="submit" 
                disabled={isLoading || isTurfCreating}
                className="w-full py-6 bg-gray-900 text-white rounded-[32px] font-black text-2xl hover:bg-primary transition-all duration-300 shadow-2xl flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading || isTurfCreating ? (
                  <Loader2 className="animate-spin w-8 h-8" />
                ) : (
                  <>Submit Registration <ArrowRight className="ml-3 group-hover:translate-x-2 transition" size={28} /></>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterOwner;
