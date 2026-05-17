const Booking = require('../models/Booking');
const Turf = require('../models/Turf');
const asyncHandler = require('../utils/asyncHandler');
const { BOOKING_STATUS } = require('../utils/constants');
const { checkOverlap } = require('../utils/bookingUtils');
const mongoose = require('mongoose');

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private
exports.getBookings = asyncHandler(async (req, res, next) => {
  let query;

  // If superAdmin, get all. If turfOwner, get bookings for their turfs. If user, get their own bookings.
  if (req.user.role === 'superAdmin') {
    query = Booking.find().populate('user', 'name email').populate('turf', 'name');
  } else if (req.user.role === 'turfOwner') {
    const turfs = await Turf.find({ owner: req.user.id });
    const turfIds = turfs.map((t) => t._id);
    query = Booking.find({ turf: { $in: turfIds } }).populate('user', 'name email').populate('turf', 'name');
  } else {
    query = Booking.find({ user: req.user.id }).populate('turf', 'name address location');
  }

  const bookings = await query.sort('-createdAt');

  res.status(200).json({
    success: true,
    count: bookings.length,
    data: bookings,
  });
});

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = asyncHandler(async (req, res, next) => {
  const { turf: turfId, date, startTime, endTime } = req.body;

  // 1. Basic time validation
  const now = new Date();
  const bdTime = new Date(now.getTime() + (6 * 60 * 60 * 1000)); // Current time in BD
  const bookingDate = new Date(date);
  
  // Set times to 00:00:00 for date-only comparison
  const todayBD = new Date(bdTime.getFullYear(), bdTime.getMonth(), bdTime.getDate());
  const selectedDate = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate());

  if (selectedDate < todayBD) {
    res.status(400);
    throw new Error('Cannot book for a past date');
  }

  if (selectedDate.getTime() === todayBD.getTime()) {
    const [nowH, nowM] = [bdTime.getUTCHours(), bdTime.getUTCMinutes()];
    const [startH, startM] = startTime.split(':').map(Number);
    
    if (startH < nowH || (startH === nowH && startM <= nowM)) {
      res.status(400);
      throw new Error('Cannot book for a past time slot');
    }
  }

  if (startTime >= endTime) {
    res.status(400);
    throw new Error('Start time must be before end time');
  }

  // 2. Check if turf exists and is approved
  const turf = await Turf.findById(turfId);
  if (!turf || turf.status !== 'approved') {
    res.status(404);
    throw new Error('Turf not found or not available for booking');
  }

  // 2. Validate time slot (e.g., startTime < endTime)
  // (Simplified for now, assuming frontend sends valid increments)

  // 3. Concurrency Protection: Use a session for transaction-safe check-then-create
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const isOverlapping = await checkOverlap(turfId, date, startTime, endTime);
    if (isOverlapping) {
      throw new Error('This time slot is already booked');
    }

    // Calculate price (simplified)
    const durationHours = 1; // Assuming 1 hour slots for now
    const totalPrice = turf.pricePerHour * durationHours;

    const booking = await Booking.create(
      [
        {
          user: req.user.id,
          turf: turfId,
          date,
          startTime,
          endTime,
          totalPrice,
          status: BOOKING_STATUS.CONFIRMED, // Auto-confirm for simulation
          paymentStatus: 'pending',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json({ success: true, data: booking[0] });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
});

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = asyncHandler(async (req, res, next) => {
  let booking = await Booking.findById(req.params.id);

  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  // Authorize: Only user who booked or turf owner/admin can cancel
  const isOwner = booking.user.toString() === req.user.id;
  const turf = await Turf.findById(booking.turf);
  const isTurfOwner = turf.owner.toString() === req.user.id;

  if (!isOwner && !isTurfOwner && req.user.role !== 'superAdmin') {
    res.status(401);
    throw new Error('Not authorized to cancel this booking');
  }

  booking.status = BOOKING_STATUS.CANCELLED;
  await booking.save();

  res.status(200).json({ success: true, data: booking });
});

// @desc    Get unavailable slots for a turf on a date
// @route   GET /api/bookings/unavailable/:turfId/:date
// @access  Public
exports.getUnavailableSlots = asyncHandler(async (req, res, next) => {
  const { turfId, date } = req.params;

  const bookings = await Booking.find({
    turf: turfId,
    date: new Date(date),
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
  }).select('startTime endTime');

  res.status(200).json({ success: true, data: bookings });
});
