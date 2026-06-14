// frontend/src/app/baseApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { getApiBaseUrl, buildAuthHeaders } from '@/lib/apiClient';
import { clearCredentials, refreshAccessToken, selectAccessToken, selectCurrentUser } from '@/features/auth/authSlice';
import { authApi } from '@/features/auth/authApi';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const state = getState();
    const token = selectAccessToken(state);
    const user = selectCurrentUser(state);
    const authHeaders = buildAuthHeaders({ accessToken: token, userId: user?.userId });

    Object.entries(authHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return headers;
  },
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshResult = await api.dispatch(
      authApi.endpoints.refresh.initiate(),
    );

    if (refreshResult.data?.accessToken) {
      api.dispatch(refreshAccessToken({ accessToken: refreshResult.data.accessToken }));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(clearCredentials());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Consent', 'CareTeam', 'Prescriptions', 'PhysicalImages', 'ImageComments', 'BreakGlass'],
  endpoints: () => ({}),
});
