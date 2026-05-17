const express = require('express');
const { 
  getAdminStats, 
  getUsers, 
  updateUser, 
  deleteUser 
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(authorize('superAdmin'));

router.get('/stats', getAdminStats);
router.route('/users').get(getUsers);
router.route('/users/:id').put(updateUser).delete(deleteUser);

module.exports = router;
