// frontend/src/features/consent/consentApi.js
import { baseApi } from '@/app/baseApi';

export const consentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyConsents: builder.query({
      query: () => '/api/consent/mine',
      providesTags: ['Consent'],
    }),
    getProviderConsents: builder.query({
      query: (mrn = '') => {
        const params = mrn.trim() ? `?mrn=${encodeURIComponent(mrn.trim())}` : '';
        return `/api/consent/provider/mine${params}`;
      },
      providesTags: ['Consent'],
    }),
    createConsent: builder.mutation({
      query: (body) => ({
        url: '/api/consent/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Consent'],
    }),
    confirmConsent: builder.mutation({
      query: ({ consentId, ...body }) => ({
        url: `/api/consent/${consentId}/confirm`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Consent'],
    }),
    renewConsent: builder.mutation({
      query: ({ consentId, ...body }) => ({
        url: `/api/consent/${consentId}/renew`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Consent'],
    }),
    revokeConsent: builder.mutation({
      query: ({ consentId, ...body }) => ({
        url: `/api/consent/${consentId}/revoke`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Consent'],
    }),
  }),
});

export const {
  useGetMyConsentsQuery,
  useGetProviderConsentsQuery,
  useCreateConsentMutation,
  useConfirmConsentMutation,
  useRenewConsentMutation,
  useRevokeConsentMutation,
} = consentApi;
