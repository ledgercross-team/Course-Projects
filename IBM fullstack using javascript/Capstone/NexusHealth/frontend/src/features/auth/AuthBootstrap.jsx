// frontend/src/features/auth/AuthBootstrap.jsx
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { authApi, useRefreshMutation } from './authApi';
import { setCredentials, clearCredentials, refreshAccessToken } from './authSlice';

export default function AuthBootstrap({ children }) {
  const dispatch = useDispatch();
  const [refresh] = useRefreshMutation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        const refreshResult = await refresh().unwrap();
        dispatch(refreshAccessToken({ accessToken: refreshResult.accessToken }));

        const meResult = await dispatch(
          authApi.endpoints.getMe.initiate(undefined, { forceRefetch: true }),
        );

        if (!cancelled && meResult.data?.user) {
          dispatch(
            setCredentials({
              accessToken: refreshResult.accessToken,
              user: meResult.data.user,
            }),
          );
        }
      } catch {
        if (!cancelled) {
          dispatch(clearCredentials());
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [dispatch, refresh]);

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading session…
      </div>
    );
  }

  return children;
}
