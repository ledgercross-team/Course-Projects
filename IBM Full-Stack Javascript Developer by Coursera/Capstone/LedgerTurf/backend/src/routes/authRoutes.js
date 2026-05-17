const express = require('express');
const {
  register,
  login,
  getMe,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');
const {
  registerValidation,
  loginValidation,
  validate,
} = require('../middleware/validationMiddleware');

const router = express.Router();

router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.get('/me', protect, getMe);

module.exports = router;
