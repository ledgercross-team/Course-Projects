// frontend/src/features/prescriptions/prescriptionsApi.js
import { baseApi } from '@/app/baseApi';

export const prescriptionsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPatientPrescriptions: builder.query({
      query: (patientId) => `/api/prescriptions/patient/${patientId}`,
      providesTags: (_result, _error, patientId) => [{ type: 'Prescriptions', id: patientId }],
    }),
    getMyPrescriptions: builder.query({
      query: () => '/api/prescriptions/mine',
      providesTags: ['Prescriptions'],
    }),
    validatePrescription: builder.mutation({
      query: (body) => ({
        url: '/api/prescriptions/validate',
        method: 'POST',
        body,
      }),
    }),
    acknowledgePrescription: builder.mutation({
      query: ({ validationEventId, acknowledgementJustification }) => ({
        url: `/api/prescriptions/${validationEventId}/acknowledge`,
        method: 'POST',
        body: { acknowledgementJustification },
      }),
    }),
    commitPrescription: builder.mutation({
      query: (body) => ({
        url: '/api/prescriptions/commit',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { patientId }) => [
        { type: 'Prescriptions', id: patientId },
        'Prescriptions',
      ],
    }),
    discontinuePrescription: builder.mutation({
      query: (body) => ({
        url: '/api/prescriptions/discontinue',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { patientId }) => [
        { type: 'Prescriptions', id: patientId },
        'Prescriptions',
      ],
    }),
  }),
});

export const {
  useGetPatientPrescriptionsQuery,
  useGetMyPrescriptionsQuery,
  useValidatePrescriptionMutation,
  useAcknowledgePrescriptionMutation,
  useCommitPrescriptionMutation,
  useDiscontinuePrescriptionMutation,
} = prescriptionsApi;
