const mongoose = require('mongoose');
const { BOOKING_STATUS } = require('../utils/constants');

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    turf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Turf',
      required: true,
    },
    date: {
      type: Date,
      required: [true, 'Please add a booking date'],
    },
    startTime: {
      type: String, // HH:mm format
      required: [true, 'Please add a start time'],
    },
    endTime: {
      type: String, // HH:mm format
      required: [true, 'Please add an end time'],
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    transactionId: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexing for faster conflict checks
bookingSchema.index({ turf: 1, date: 1, status: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
