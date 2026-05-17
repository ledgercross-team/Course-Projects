const express = require('express');
const {
  getTurfs,
  getTurf,
  createTurf,
  updateTurf,
  deleteTurf,
  approveTurf,
} = require('../controllers/turfController');

const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

router
  .route('/')
  .get(getTurfs)
  .post(protect, authorize(USER_ROLES.TURF_OWNER), upload.array('images', 5), createTurf);

router
  .route('/:id')
  .get(getTurf)
  .put(protect, authorize(USER_ROLES.TURF_OWNER, USER_ROLES.SUPER_ADMIN), updateTurf)
  .delete(protect, authorize(USER_ROLES.TURF_OWNER, USER_ROLES.SUPER_ADMIN), deleteTurf);

router
  .route('/:id/approve')
  .put(protect, authorize(USER_ROLES.SUPER_ADMIN), approveTurf);

module.exports = router;
