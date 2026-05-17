const Turf = require('../models/Turf');
const asyncHandler = require('../utils/asyncHandler');
const { TURF_STATUS, BOOKING_STATUS } = require('../utils/constants');

// @desc    Get all turfs (with filters & pagination)
// @route   GET /api/turfs
// @access  Public
exports.getTurfs = asyncHandler(async (req, res, next) => {
  const reqQuery = { ...req.query };
  const removeFields = [
    'select', 'sort', 'page', 'limit', 
    'lat', 'lng', 'distance', 'date', 
    'startTime', 'endTime', 'search', 'area', 'name',
    'availableNow'
  ];
  removeFields.forEach((param) => delete reqQuery[param]);

  let queryStr = JSON.stringify(reqQuery);
  queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, (match) => `$${match}`);
  let baseQuery = JSON.parse(queryStr);

  // Available Now Filter
  if (req.query.availableNow === 'true') {
    const Booking = require('../models/Booking');
    const now = new Date();
    const bdTime = new Date(now.getTime() + (6 * 60 * 60 * 1000));
    const currentHour = bdTime.getUTCHours();
    const currentHourStr = `${String(currentHour).padStart(2, '0')}:00`;
    const todayStr = bdTime.toISOString().split('T')[0];

    // Find turfs that ARE booked for the current slot
    const fullyBooked = await Booking.find({
      date: new Date(todayStr),
      status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
      startTime: currentHourStr
    }).distinct('turf');

    baseQuery._id = { $nin: fullyBooked };
    baseQuery.openingTime = { $lte: currentHourStr };
    baseQuery.closingTime = { $gt: currentHourStr };
  }

  // Improved Area and Name Search (Fuzzy/Regex)
  if (req.query.area) {
    baseQuery['location.area'] = { $regex: req.query.area, $options: 'i' };
  }
  
  if (req.query.name) {
    baseQuery.name = { $regex: req.query.name, $options: 'i' };
  }

  // Support for general 'search' term across area and name
  if (req.query.search) {
    const searchRegex = { $regex: req.query.search, $options: 'i' };
    baseQuery.$or = [
      { name: searchRegex },
      { 'location.area': searchRegex },
      { address: searchRegex }
    ];
  }

  // Role-based visibility
  if (!req.user || req.user.role !== 'superAdmin') {
    baseQuery.status = TURF_STATUS.APPROVED;
  }

  // Owner filtering for dashboards
  if (req.query.owner) {
    baseQuery.owner = req.query.owner;
  }

  // GeoJSON Spatial search
// Geo search disabled temporarily for Vercel stability
/*
if (req.query.lat && req.query.lng) {
  const lat = parseFloat(req.query.lat);
  const lng = parseFloat(req.query.lng);
  const distance = parseFloat(req.query.distance) || 10;
  const radius = distance / 6378.1;

  baseQuery.location = {
    $geoWithin: { $centerSphere: [[lng, lat], radius] },
  };
}
*/

  // Availability Filtering
  if (req.query.date && req.query.startTime && req.query.endTime) {
    const Booking = require('../models/Booking');
    // Find turfs that ARE booked in this slot
    const overlappingBookings = await Booking.find({
      date: new Date(req.query.date),
      status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
      $or: [
        { startTime: { $lt: req.query.endTime, $gte: req.query.startTime } },
        { endTime: { $gt: req.query.startTime, $lte: req.query.endTime } }
      ]
    }).distinct('turf');
    
    // Exclude those turfs
    baseQuery._id = { $nin: overlappingBookings };
  }

  let query = Turf.find(baseQuery);

try {
  query = query.populate('owner', 'name email phone');
} catch (err) {
  console.log('Populate failed:', err.message);
}

  // Select Fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20; // Increased for better discovery
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await Turf.countDocuments(baseQuery);

  query = query.skip(startIndex).limit(limit);

  const turfs = await query;

  const pagination = {};
  if (endIndex < total) pagination.next = { page: page + 1, limit };
  if (startIndex > 0) pagination.prev = { page: page - 1, limit };

  res.status(200).json({
    success: true,
    count: turfs.length,
    pagination,
    data: turfs,
  });
});

// @desc    Get single turf
// @route   GET /api/turfs/:id
// @access  Public
exports.getTurf = asyncHandler(async (req, res, next) => {
  const turf = await Turf.findById(req.params.id).populate('owner', 'name email phone');

  if (!turf) {
    res.status(404);
    throw new Error(`Turf not found with id of ${req.params.id}`);
  }

  res.status(200).json({ success: true, data: turf });
});

// @desc    Create new turf
// @route   POST /api/turfs
// @access  Private (Owner)
exports.createTurf = asyncHandler(async (req, res, next) => {
  req.body.owner = req.user.id;

  if (req.body.coordinates) {
    let coords = req.body.coordinates;
    if (typeof coords === 'string') coords = JSON.parse(coords);
    req.body.location = {
      type: 'Point',
      coordinates: coords,
      area: req.body.area,
      city: 'Dhaka'
    };
  }

  if (req.files) {
    req.body.images = req.files.map(file => file.path);
  }

  const turf = await Turf.create(req.body);
  res.status(201).json({ success: true, data: turf });
});

// @desc    Update turf
// @route   PUT /api/turfs/:id
// @access  Private (Owner/Admin)
exports.updateTurf = asyncHandler(async (req, res, next) => {
  let turf = await Turf.findById(req.params.id);

  if (!turf) {
    res.status(404);
    throw new Error(`Turf not found with id of ${req.params.id}`);
  }

  if (turf.owner.toString() !== req.user.id && req.user.role !== 'superAdmin') {
    res.status(401);
    throw new Error(`User ${req.user.id} is not authorized to update this turf`);
  }

  if (req.user.role !== 'superAdmin') {
    req.body.status = TURF_STATUS.PENDING;
  }

  turf = await Turf.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: turf });
});

// @desc    Delete turf
// @route   DELETE /api/turfs/:id
// @access  Private (Owner/Admin)
exports.deleteTurf = asyncHandler(async (req, res, next) => {
  const turf = await Turf.findById(req.params.id);

  if (!turf) {
    res.status(404);
    throw new Error(`Turf not found with id of ${req.params.id}`);
  }

  if (turf.owner.toString() !== req.user.id && req.user.role !== 'superAdmin') {
    res.status(401);
    throw new Error(`User ${req.user.id} is not authorized to delete this turf`);
  }

  await turf.deleteOne();
  res.status(200).json({ success: true, data: {} });
});

// @desc    Approve or Reject turf
// @route   PUT /api/turfs/:id/approve
// @access  Private (Admin)
exports.approveTurf = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (![TURF_STATUS.APPROVED, TURF_STATUS.REJECTED].includes(status)) {
    res.status(400);
    throw new Error('Please provide a valid status (approved or rejected)');
  }

  const turf = await Turf.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );

  if (!turf) {
    res.status(404);
    throw new Error(`Turf not found with id of ${req.params.id}`);
  }

  res.status(200).json({ success: true, data: turf });
});
