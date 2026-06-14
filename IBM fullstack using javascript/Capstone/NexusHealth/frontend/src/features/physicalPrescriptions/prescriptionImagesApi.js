// frontend/src/features/physicalPrescriptions/prescriptionImagesApi.js
import { baseApi } from '@/app/baseApi';

export const prescriptionImagesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // PATIENT: upload one or more images (multipart)
    uploadPrescriptionImages: builder.mutation({
      queryFn: async (formData, _queryApi, _extraOptions, baseQuery) => {
        const result = await baseQuery({
          url: '/api/prescription-images',
          method: 'POST',
          body: formData,
          // Don't set Content-Type — browser sets it with boundary for FormData
          formData: true,
        });
        return result;
      },
      invalidatesTags: (_r, _e, _arg) => [{ type: 'PhysicalImages' }],
    }),

    // PATIENT: list own images
    listMyImages: builder.query({
      query: (patientId) => `/api/prescription-images/patient/${patientId}`,
      providesTags: [{ type: 'PhysicalImages' }],
    }),

    // PATIENT: delete image
    deleteImage: builder.mutation({
      query: (imageId) => ({
        url: `/api/prescription-images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'PhysicalImages' }],
    }),

    // PHYSICIAN: list patient images
    physicianListImages: builder.query({
      query: (patientId) => `/api/prescription-images/physician/patient/${patientId}`,
      providesTags: (_r, _e, patientId) => [{ type: 'PhysicalImages', id: patientId }],
    }),

    // PHYSICIAN: add comment
    addImageComment: builder.mutation({
      query: ({ imageId, body }) => ({
        url: `/api/prescription-images/${imageId}/comments`,
        method: 'POST',
        body: { body },
      }),
      invalidatesTags: (_r, _e, { imageId }) => [{ type: 'ImageComments', id: imageId }],
    }),

    // PHYSICIAN / PATIENT: list comments
    listImageComments: builder.query({
      query: (imageId) => `/api/prescription-images/${imageId}/comments`,
      providesTags: (_r, _e, imageId) => [{ type: 'ImageComments', id: imageId }],
    }),
  }),
});

export const {
  useUploadPrescriptionImagesMutation,
  useListMyImagesQuery,
  useDeleteImageMutation,
  usePhysicianListImagesQuery,
  useAddImageCommentMutation,
  useListImageCommentsQuery,
} = prescriptionImagesApi;
