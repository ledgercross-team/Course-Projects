import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { register, reset } from '@/store/authSlice';
import { toast } from 'react-hot-toast';
import { Mail, Lock, User as UserIcon, Phone, Loader2, ArrowRight } from 'lucide-react';
import FormInput from '@/components/common/FormInput';
import { validatePhone } from '@/utils/formatters';

const RegisterPlayer = () => {
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'player',
  });

  const [errors, setErrors] = React.useState({});

  const { name, email, phone, password } = formData;
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  React.useEffect(() => {
    if (isError) {
      toast.error(message);
      dispatch(reset());
    }

    if (isSuccess && user) {
      toast.success(`Welcome to the team, ${user.name}!`);
      navigate('/dashboard/player');
      dispatch(reset());
    }
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const onChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user types
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!name) newErrors.name = "Full name is required";
    if (!email) newErrors.email = "Email is required";
    if (!validatePhone(phone)) newErrors.phone = "Enter a valid 11-digit number (e.g. 017XXXXXXXX)";
    if (password.length < 6) newErrors.password = "Password must be at least 6 characters";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    dispatch(register({ ...formData, phone: phone.trim() }));
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white p-10 rounded-[48px] shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="bg-primary/10 w-20 h-20 rounded-[24px] flex items-center justify-center mx-auto mb-6">
            <UserIcon className="text-primary w-10 h-10" />
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Join as Player</h2>
          <p className="mt-3 text-gray-500 font-medium"> Dhaka's premier turf network is waiting.</p>
        </div>

        <form className="space-y-6" onSubmit={onSubmit}>
          <FormInput
            label="Full Name"
            name="name"
            placeholder="John Doe"
            icon={UserIcon}
            value={name}
            onChange={onChange}
            error={errors.name}
            required
          />

          <FormInput
            label="Email Address"
            name="email"
            type="email"
            placeholder="john@example.com"
            icon={Mail}
            value={email}
            onChange={onChange}
            error={errors.email}
            autoComplete="off"
            required
          />

          <FormInput
            label="Phone Number"
            name="phone"
            placeholder="01XXXXXXXXX"
            icon={Phone}
            value={phone}
            onChange={onChange}
            error={errors.phone}
            autoComplete="off"
            required
          />

          <FormInput
            label="Password"
            name="password"
            type="password"
            placeholder="Min. 6 characters"
            icon={Lock}
            value={password}
            onChange={onChange}
            error={errors.password}
            autoComplete="new-password"
            required
          />

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-5 bg-gray-900 text-white rounded-[24px] font-black text-xl hover:bg-primary transition-all duration-300 shadow-xl shadow-gray-200 flex items-center justify-center group"
          >
            {isLoading ? (
              <Loader2 className="animate-spin w-7 h-7" />
            ) : (
              <>
                Create Ticket <ArrowRight className="ml-2 w-6 h-6 group-hover:translate-x-1 transition" />
              </>
            )}
          </button>
        </form>

        <p className="mt-10 text-center text-gray-500 font-medium">
          Own a turf? <Link to="/register/owner" className="text-primary font-black hover:underline">List it here</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPlayer;
