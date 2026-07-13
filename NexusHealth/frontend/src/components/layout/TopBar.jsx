// frontend/src/components/layout/TopBar.jsx
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Copy, LogOut, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { clearCredentials, selectCurrentUser, selectUserDisplayName } from '@/features/auth/authSlice';
import { authApi, useLogoutMutation } from '@/features/auth/authApi';
import { useGetPatientProfileQuery } from '@/features/users/usersApi';
import { baseApi } from '@/app/baseApi';
import { clearConsents } from '@/features/consent/consentSlice';
import { applyTheme, getStoredTheme } from '@/lib/theme';

export default function TopBar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectCurrentUser);
  const displayName = useSelector(selectUserDisplayName);
  const isPatient = user?.role === 'PATIENT';
  const { data: patientProfile } = useGetPatientProfileQuery(user?.userId, {
    skip: !isPatient || !user?.userId,
    refetchOnMountOrArgChange: true,
  });
  const [logout] = useLogoutMutation();
  const [isDark, setIsDark] = useState(() => getStoredTheme() === 'dark');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    applyTheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  const handleCopyMrn = async () => {
    if (!patientProfile?.mrn) return;

    try {
      await navigator.clipboard.writeText(patientProfile.mrn);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleLogout = async () => {
    await logout({ user });
    dispatch(authApi.util.resetApiState());
    dispatch(baseApi.util.resetApiState());
    dispatch(clearCredentials());
    dispatch(clearConsents());
    navigate('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 flex min-h-[64px] items-center justify-between border-b bg-background/95 px-6 py-4 backdrop-blur">
      <div className="min-w-0 max-w-md">
        <p className="text-sm text-muted-foreground">Signed in as</p>
        <p className="truncate font-semibold text-foreground">{displayName}</p>
        {isPatient && patientProfile?.mrn && (
          <div className="mt-1 flex min-w-0 items-center gap-1">
            <span className="min-w-0 truncate font-mono text-xs text-muted-foreground" title={patientProfile.mrn}>
              {patientProfile.mrn}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              aria-label={copied ? 'MRN copied' : 'Copy MRN'}
              onClick={handleCopyMrn}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="font-mono text-xs">
          {user?.role}
        </Badge>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setIsDark((value) => !value)}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button type="button" variant="outline" className="text-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}
