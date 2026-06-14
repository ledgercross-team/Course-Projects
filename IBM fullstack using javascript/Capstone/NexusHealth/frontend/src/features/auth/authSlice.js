// frontend/src/features/auth/authSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.isAuthenticated = Boolean(user);
    },
    clearCredentials: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
    },
    refreshAccessToken: (state, action) => {
      state.accessToken = action.payload.accessToken;
    },
    updateCurrentUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const { setCredentials, clearCredentials, refreshAccessToken, updateCurrentUser } = authSlice.actions;

export const selectAuth = (state) => state.auth;
export const selectCurrentUser = (state) => state.auth.user;
export const selectUserDisplayName = (state) => {
  const user = state.auth.user;
  if (!user) return '';
  if (user.name) return user.name;
  const first = user.demographics?.legalName?.first;
  const last = user.demographics?.legalName?.last;
  return [first, last].filter(Boolean).join(' ');
};
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAccessToken = (state) => state.auth.accessToken;

export default authSlice.reducer;
