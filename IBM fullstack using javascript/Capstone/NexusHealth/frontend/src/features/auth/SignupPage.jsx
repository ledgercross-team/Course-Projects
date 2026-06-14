// frontend/src/features/auth/SignupPage.jsx
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import ProviderSearchCombobox from '@/features/consent/ProviderSearchCombobox';
import { authApi, useRegisterMutation } from './authApi';
import { setCredentials } from './authSlice';
import { baseApi } from '@/app/baseApi';
import { getHomeRouteForRole } from './roleGuards';
import AuthPageLayout from './AuthPageLayout';

const inputClassName =
  'border-slate-700 bg-slate-950/80 text-slate-100 placeholder:text-slate-500 focus-visible:ring-emerald-500/50';

export default function SignupPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [register, { isLoading, error }] = useRegisterMutation();
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
  });

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const result = await register({
        ...form,
        primaryPhysicianId: selectedProvider?.id,
      }).unwrap();

      dispatch(authApi.util.resetApiState());
      dispatch(baseApi.util.resetApiState());
      dispatch(setCredentials(result));
      navigate(getHomeRouteForRole(result.user.role), { replace: true });
    } catch {
      // Error shown below.
    }
  };

  return (
    <AuthPageLayout
      wide
      title="Create patient account"
      description="Self-register to manage your clinical consent sharing."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-slate-300">
              First name
            </Label>
            <Input
              id="firstName"
              value={form.firstName}
              onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
              className={inputClassName}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-slate-300">
              Last name
            </Label>
            <Input
              id="lastName"
              value={form.lastName}
              onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
              className={inputClassName}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-300">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
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
            minLength={3}
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            className={inputClassName}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfBirth" className="text-slate-300">
            Date of birth
          </Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={form.dateOfBirth}
            onChange={(event) => setForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
            className={inputClassName}
            required
          />
        </div>

        <ProviderSearchCombobox value={selectedProvider?.id} onChange={setSelectedProvider} />

        {error && (
          <div
            className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
            role="alert"
          >
            {error.data?.error || 'Registration failed.'}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
          disabled={isLoading}
        >
          {isLoading ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link className="text-emerald-400 hover:underline" to="/login">
            Sign in
          </Link>
        </p>
      </form>
    </AuthPageLayout>
  );
}
