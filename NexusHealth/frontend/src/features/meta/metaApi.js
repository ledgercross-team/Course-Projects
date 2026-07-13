// frontend/src/features/meta/metaApi.js
import { baseApi } from '@/app/baseApi';

export const metaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getClinicalDomains: builder.query({
      query: () => '/api/meta/clinical-domains',
    }),
  }),
});

export const { useGetClinicalDomainsQuery } = metaApi;
