const express = require('express');
const {
  getBookings,
  createBooking,
  cancelBooking,
  getUnavailableSlots,
} = require('../controllers/bookingController');

const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, getBookings).post(protect, createBooking);

router.route('/:id/cancel').put(protect, cancelBooking);

router.route('/unavailable/:turfId/:date').get(getUnavailableSlots);

module.exports = router;
