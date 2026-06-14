// frontend/src/features/prescriptions/drugsApi.js
import { baseApi } from '@/app/baseApi';

export const drugsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchDrugs: builder.query({
      query: (searchTerm) => `/api/drugs/search?q=${encodeURIComponent(searchTerm)}`,
      keepUnusedDataFor: 300,
    }),
  }),
});

export const {
  useSearchDrugsQuery,
  useLazySearchDrugsQuery,
} = drugsApi;
