const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
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
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please add a rating between 1 and 5'],
    },
    comment: {
      type: String,
      required: [true, 'Please add a comment'],
    },
  },
  {
    timestamps: true,
  }
);

// Static method to get avg rating and save
reviewSchema.statics.getAverageRating = async function (turfId) {
  const obj = await this.aggregate([
    {
      $match: { turf: turfId },
    },
    {
      $group: {
        _id: '$turf',
        averageRating: { $avg: '$rating' },
      },
    },
  ]);

  try {
    await this.model('Turf').findByIdAndUpdate(turfId, {
      averageRating: obj[0] ? obj[0].averageRating.toFixed(1) : 0,
    });
  } catch (err) {
    console.error(err);
  }
};

// Call getAverageRating after save
reviewSchema.post('save', function () {
  this.constructor.getAverageRating(this.turf);
});

// Call getAverageRating before remove
reviewSchema.pre('remove', function () {
  this.constructor.getAverageRating(this.turf);
});

module.exports = mongoose.model('Review', reviewSchema);
