// frontend/src/app/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import consentReducer from '@/features/consent/consentSlice';
import { authApi } from '@/features/auth/authApi';
import { baseApi } from '@/app/baseApi';
import '@/features/users/usersApi';
import '@/features/admin/adminApi';
import '@/features/meta/metaApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    consent: consentReducer,
    [authApi.reducerPath]: authApi.reducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, baseApi.middleware),
});
