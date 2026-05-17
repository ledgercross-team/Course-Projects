const User = require('../models/User');
const Turf = require('../models/Turf');
const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get dashboard stats for Admin
// @route   GET /api/admin/stats
// @access  Private (Admin)
exports.getAdminStats = asyncHandler(async (req, res, next) => {
  const totalPlayers = await User.countDocuments({ role: 'player' });
  const totalOwners = await User.countDocuments({ role: 'turfOwner' });
  const totalBookings = await Booking.countDocuments();
  
  const revenue = await Booking.aggregate([
    { $match: { status: 'confirmed' } },
    { $group: { _id: null, total: { $sum: '$totalPrice' } } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalPlayers,
      totalOwners,
      totalBookings,
      totalRevenue: revenue[0] ? revenue[0].total : 0
    }
  });
});

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getUsers = asyncHandler(async (req, res, next) => {
  const users = await User.find({ role: { $ne: 'superAdmin' } });
  res.status(200).json({ success: true, data: users });
});

// @desc    Update user status
// @route   PUT /api/admin/users/:id
// @access  Private (Admin)
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  res.status(200).json({ success: true, data: user });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = asyncHandler(async (req, res, next) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, data: {} });
});
