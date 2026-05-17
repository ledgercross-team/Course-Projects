const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');
const { BOOKING_STATUS } = require('../utils/constants');

/**
 * Helper to convert HH:mm to minutes from start of day
 */
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Logic to check for overlapping bookings
 */
exports.checkOverlap = async (turfId, date, startTime, endTime, excludeBookingId = null) => {
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  // Find all active bookings for this turf on this date
  const bookings = await Booking.find({
    turf: turfId,
    date: new Date(date),
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
    _id: { $ne: excludeBookingId }
  });

  for (const booking of bookings) {
    const bStart = timeToMinutes(booking.startTime);
    const bEnd = timeToMinutes(booking.endTime);

    // Overlap condition: (StartA < EndB) AND (EndA > StartB)
    if (startMin < bEnd && endMin > bStart) {
      return true;
    }
  }

  return false;
};
