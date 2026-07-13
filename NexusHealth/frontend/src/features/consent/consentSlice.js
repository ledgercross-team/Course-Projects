// frontend/src/features/consent/consentSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  consents: [],
  selectedConsentId: null,
};

const consentSlice = createSlice({
  name: 'consent',
  initialState,
  reducers: {
    upsertConsent: (state, action) => {
      const consent = action.payload;
      const index = state.consents.findIndex((item) => item.consentId === consent.consentId);

      if (index >= 0) {
        state.consents[index] = { ...state.consents[index], ...consent };
      } else {
        state.consents.unshift(consent);
      }
    },
    setSelectedConsentId: (state, action) => {
      state.selectedConsentId = action.payload;
    },
    clearConsents: (state) => {
      state.consents = [];
      state.selectedConsentId = null;
    },
  },
});

export const { upsertConsent, setSelectedConsentId, clearConsents } = consentSlice.actions;

export const selectConsents = (state) => state.consent.consents;
export const selectSelectedConsent = (state) =>
  state.consent.consents.find((item) => item.consentId === state.consent.selectedConsentId) || null;

export default consentSlice.reducer;
