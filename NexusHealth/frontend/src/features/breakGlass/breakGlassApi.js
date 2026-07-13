// frontend/src/features/breakGlass/breakGlassApi.js
import { baseApi } from '@/app/baseApi';

export const breakGlassApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    executeBreakGlassOverride: builder.mutation({
      query: (body) => ({
        url: '/api/break-glass/override',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BreakGlass', 'Consent'],
    }),

    getComplianceQueue: builder.query({
      query: () => '/api/break-glass/compliance-queue',
      providesTags: [{ type: 'BreakGlass', id: 'COMPLIANCE_QUEUE' }],
    }),

    getTier2RequestStatus: builder.query({
      query: (eventId) => `/api/break-glass/${eventId}/status`,
      providesTags: (_result, _error, eventId) => [{ type: 'BreakGlass', id: eventId }],
    }),

    approveTier2Request: builder.mutation({
      query: (eventId) => ({
        url: `/api/break-glass/${eventId}/approve`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['BreakGlass', 'Consent'],
    }),

    denyTier2Request: builder.mutation({
      query: (eventId) => ({
        url: `/api/break-glass/${eventId}/deny`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: ['BreakGlass', 'Consent'],
    }),

    getPatientBreakGlassAlerts: builder.query({
      query: () => '/api/break-glass/patient/alerts',
      providesTags: [{ type: 'BreakGlass', id: 'PATIENT_ALERTS' }],
    }),
  }),
});

export const {
  useExecuteBreakGlassOverrideMutation,
  useGetComplianceQueueQuery,
  useGetTier2RequestStatusQuery,
  useApproveTier2RequestMutation,
  useDenyTier2RequestMutation,
  useGetPatientBreakGlassAlertsQuery,
} = breakGlassApi;
