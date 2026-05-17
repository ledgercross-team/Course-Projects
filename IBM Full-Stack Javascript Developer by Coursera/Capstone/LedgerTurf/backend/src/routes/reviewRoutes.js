const express = require('express');
const { getReviews, addReview } = require('../controllers/reviewController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/turf/:turfId', getReviews);
router.post('/turf/:turfId', protect, addReview);

module.exports = router;
