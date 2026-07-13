// backend/services/profileService.js
const { User } = require('../models');
const {
  validatePassword,
  hashPassword,
  verifyPassword,
  toPublicUser,
} = require('./authService');

const normalizePhone = (phone) => {
  if (phone == null) return undefined;
  const trimmed = String(phone).trim();
  return trimmed.length > 0 ? trimmed : '';
};

const updateMyProfile = async (userId, { primaryPhone } = {}) => {
  if (primaryPhone === undefined) {
    const error = new Error('No profile fields provided to update');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  user.demographics.contactInfo = {
    ...(user.demographics.contactInfo || {}),
    primaryPhone: normalizePhone(primaryPhone),
  };

  await user.save();
  return toPublicUser(user);
};

const changeMyPassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    const error = new Error('currentPassword and newPassword are required');
    error.statusCode = 400;
    throw error;
  }

  validatePassword(newPassword);

  const user = await User.findById(userId).select('+credentials');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const valid = await verifyPassword(currentPassword, user.credentials.hashedPassword);
  if (!valid) {
    const error = new Error('Current password is incorrect');
    error.statusCode = 401;
    throw error;
  }

  user.credentials.hashedPassword = await hashPassword(newPassword);
  await user.save();

  return { success: true };
};

const deleteMyAccount = async (userId, { password }) => {
  if (!password) {
    const error = new Error('password is required to delete your account');
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId).select('+credentials');
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const valid = await verifyPassword(password, user.credentials.hashedPassword);
  if (!valid) {
    const error = new Error('Password is incorrect');
    error.statusCode = 401;
    throw error;
  }

  user.accountStatus = 'SUSPENDED';
  user.credentials.authSessionToken = undefined;
  await user.save();

  return { success: true };
};

module.exports = {
  normalizePhone,
  updateMyProfile,
  changeMyPassword,
  deleteMyAccount,
};
