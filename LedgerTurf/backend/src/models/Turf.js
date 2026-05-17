const mongoose = require('mongoose');
const { TURF_STATUS } = require('../utils/constants');

const turfSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Please add a turf name'],
      trim: true,
      maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    address: {
      type: String,
      required: [true, 'Please add an address'],
    },
    location: {
      // GeoJSON Point
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
        index: '2dsphere',
      },
      formattedAddress: String,
      city: String,
      area: String,
    },
    sportTypes: {
      type: [String],
      required: true,
      enum: ['Football', 'Cricket'],
    },
    pricePerHour: {
      type: Number,
      required: [true, 'Please add a price per hour'],
    },
    openingTime: {
      type: String,
      default: '06:00',
    },
    closingTime: {
      type: String,
      default: '23:00',
    },
    images: {
      type: [String],
      default: [],
    },
    isIndoor: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: Object.values(TURF_STATUS),
      default: TURF_STATUS.PENDING,
    },
    averageRating: {
      type: Number,
      min: [0, 'Rating cannot be less than 0'],
      max: [5, 'Rating cannot be more than 5'],
      default: 0,
    },
    mapLink: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Turf', turfSchema);
