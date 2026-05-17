const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Turf = require('../models/Turf');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get reviews for a turf
// @route   GET /api/reviews/turf/:turfId
// @access  Public
exports.getReviews = asyncHandler(async (req, res, next) => {
  const reviews = await Review.find({ turf: req.params.turfId }).populate('user', 'name');

  res.status(200).json({
    success: true,
    count: reviews.length,
    data: reviews,
  });
});

// @desc    Add review for a turf
// @route   POST /api/reviews/turf/:turfId
// @access  Private
exports.addReview = asyncHandler(async (req, res, next) => {
  req.body.turf = req.params.turfId;
  req.body.user = req.user.id;

  const turf = await Turf.findById(req.params.turfId);
  if (!turf) {
    res.status(404);
    throw new Error('Turf not found');
  }

  // Check if user has a completed booking for this turf
  const booking = await Booking.findOne({
    user: req.user.id,
    turf: req.params.turfId,
    status: 'completed', // Or 'confirmed' if we want to be lenient
  });

  if (!booking) {
    // For demo purposes, we might want to allow if they have ANY booking
    const anyBooking = await Booking.findOne({
      user: req.user.id,
      turf: req.params.turfId
    });
    
    if (!anyBooking) {
      res.status(400);
      throw new Error('You must complete a booking before reviewing');
    }
  }

  // Check if user already reviewed
  const alreadyReviewed = await Review.findOne({
    user: req.user.id,
    turf: req.params.turfId
  });

  if (alreadyReviewed) {
    res.status(400);
    throw new Error('You have already reviewed this turf');
  }

  const review = await Review.create(req.body);

  res.status(201).json({
    success: true,
    data: review,
  });
});
