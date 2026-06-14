// frontend/src/features/auth/LoginPage.jsx
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi, useLoginMutation } from './authApi';
import { setCredentials } from './authSlice';
import { baseApi } from '@/app/baseApi';
import { getHomeRouteForRole } from './roleGuards';
import AuthPageLayout from './AuthPageLayout';

const inputClassName =
  'border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500/50';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [login, { isLoading, error }] = useLoginMutation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const result = await login({ email, password }).unwrap();
      dispatch(authApi.util.resetApiState());
      dispatch(baseApi.util.resetApiState());
      dispatch(setCredentials(result));
      navigate(getHomeRouteForRole(result.user.role), { replace: true });
    } catch {
      // Error shown below.
    }
  };

  return (
    <AuthPageLayout title="Sign in" description="Access the Clinical Portal with your credentials.">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-300">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            className={inputClassName}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-300">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            className={inputClassName}
            required
          />
        </div>

        {error && (
          <div
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
            role="alert"
          >
            {error.data?.error || 'Login failed. Check your credentials.'}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
          disabled={isLoading}
        >
          {isLoading ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="text-center text-sm text-slate-500">
          New patient?{' '}
          <Link className="text-emerald-400 hover:underline" to="/signup">
            Create an account
          </Link>
        </p>

        <p className="text-center text-xs text-slate-600">
          Physicians, CMOs, and admins are invited by your organization administrator.
        </p>
      </form>
    </AuthPageLayout>
  );
}
