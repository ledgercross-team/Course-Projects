import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { login, reset } from '@/store/authSlice';
import { toast } from 'react-hot-toast';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import FormInput from '@/components/common/FormInput';

const Login = () => {
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
  });

  const { email, password } = formData;

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const { user, isLoading, isError, isSuccess, message } = useSelector(
    (state) => state.auth
  );

  React.useEffect(() => {
    if (isError) {
      toast.error(message);
      dispatch(reset());
    }

    if (isSuccess && user) {
      toast.success(`Welcome back, ${user.name}!`);
      if (user.role === 'superAdmin') {
        navigate('/dashboard/admin');
      } else if (user.role === 'turfOwner') {
        navigate('/dashboard/owner');
      } else {
        navigate('/dashboard/player');
      }
      dispatch(reset());
    }
  }, [user, isError, isSuccess, message, navigate, dispatch]);

  const onChange = (e) => {
    setFormData((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    dispatch(login(formData));
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-10 rounded-[48px] shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="bg-primary/10 w-20 h-20 rounded-[24px] flex items-center justify-center mx-auto mb-6">
            <Lock className="text-primary w-10 h-10" />
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Welcome Back</h2>
          <p className="mt-3 text-gray-500 font-medium">
            Sign in to book your favorite turf
          </p>
        </div>
        <form className="space-y-6" onSubmit={onSubmit}>
          <div className="space-y-6">
            <FormInput
              label="Email Address"
              name="email"
              type="email"
              required
              autoComplete="off"
              placeholder="name@example.com"
              icon={Mail}
              value={email}
              onChange={onChange}
            />
            <FormInput
              label="Password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              icon={Lock}
              value={password}
              onChange={onChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to="/register/player" className="font-bold text-primary hover:text-primary-dark transition">
                Don't have an account?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-5 px-4 border border-transparent rounded-[24px] shadow-xl text-xl font-black text-white bg-gray-900 hover:bg-primary transition disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <Loader2 className="animate-spin h-7 w-7" />
            ) : (
              <>
                Sign In <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
