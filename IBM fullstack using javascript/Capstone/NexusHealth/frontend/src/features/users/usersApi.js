// frontend/src/features/users/usersApi.js
import { baseApi } from '@/app/baseApi';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getClinicalRecords: builder.query({
      query: (patientId) => `/api/clinical-records/patient/${patientId}`,
    }),
    searchProviders: builder.query({
      query: (searchTerm) => `/api/users/providers/search?q=${encodeURIComponent(searchTerm)}`,
    }),
    getPatientProfile: builder.query({
      query: () => '/api/users/me',
      serializeQueryArgs: ({ endpointName, queryArgs }) => `${endpointName}-${queryArgs || 'anonymous'}`,
    }),
    getMyDoctors: builder.query({
      query: () => '/api/users/me/doctors',
      providesTags: ['CareTeam'],
    }),
    addDoctor: builder.mutation({
      query: (physicianId) => ({
        url: '/api/users/me/doctors',
        method: 'POST',
        body: { physicianId },
      }),
      invalidatesTags: ['CareTeam'],
    }),
    removeDoctor: builder.mutation({
      query: (physicianId) => ({
        url: `/api/users/me/doctors/${physicianId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['CareTeam'],
    }),
  }),
});

export const {
  useGetClinicalRecordsQuery,
  useSearchProvidersQuery,
  useLazySearchProvidersQuery,
  useGetPatientProfileQuery,
  useGetMyDoctorsQuery,
  useAddDoctorMutation,
  useRemoveDoctorMutation,
} = usersApi;
