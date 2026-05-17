import api from './api';

const bookingService = {
  getBookings: async () => {
    const response = await api.get('/bookings');
    return response.data;
  },

  createBooking: async (bookingData) => {
    const response = await api.post('/bookings', bookingData);
    return response.data;
  },

  cancelBooking: async (id) => {
    const response = await api.put(`/bookings/${id}/cancel`);
    return response.data;
  },

  getUnavailableSlots: async (turfId, date) => {
    const response = await api.get(`/bookings/unavailable/${turfId}/${date}`);
    return response.data;
  },
};

export default bookingService;
