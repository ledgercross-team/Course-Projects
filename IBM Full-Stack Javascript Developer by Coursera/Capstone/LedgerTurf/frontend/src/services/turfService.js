import api from '@/services/api';

const turfService = {
  getTurfs: async (params) => {
    console.log('turfService.getTurfs called with:', params);
    const response = await api.get('/turfs', { params });
    console.log('turfService.getTurfs response:', response.data);
    return response.data;
  },

  getTurf: async (id) => {
    console.log('turfService.getTurf called with id:', id);
    const response = await api.get(`/turfs/${id}`);
    console.log('turfService.getTurf response:', response.data);
    return response.data;
  },

  createTurf: async (turfData) => {
    const response = await api.post('/turfs', turfData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  updateTurf: async (id, turfData) => {
    const isFormData = turfData instanceof FormData;
    const response = await api.put(`/turfs/${id}`, turfData, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return response.data;
  },

  deleteTurf: async (id) => {
    const response = await api.delete(`/turfs/${id}`);
    return response.data;
  },

  approveTurf: async (id, status) => {
    const response = await api.put(`/turfs/${id}/approve`, { status });
    return response.data;
  },
};

export default turfService;
