// frontend/src/features/admin/adminApi.js
import { baseApi } from '@/app/baseApi';

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    inviteUser: builder.mutation({
      query: (body) => ({
        url: '/api/admin/users/invite',
        method: 'POST',
        body,
      }),
    }),
    listUsers: builder.query({
      query: ({ role, accountStatus } = {}) => {
        const params = new URLSearchParams();
        if (role) params.set('role', role);
        if (accountStatus) params.set('accountStatus', accountStatus);
        const query = params.toString();
        return `/api/admin/users${query ? `?${query}` : ''}`;
      },
    }),
  }),
});

export const { useInviteUserMutation, useListUsersQuery } = adminApi;
