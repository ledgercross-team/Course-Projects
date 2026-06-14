// backend/services/adminUserService.js
const crypto = require('crypto');
const { User, CLINICAL_DOMAINS } = require('../models');
const { hashPassword, toPublicUser } = require('./authService');

const INVITABLE_ROLES = ['PHYSICIAN', 'CMO', 'ADMIN'];

const generateTempPassword = () => crypto.randomBytes(9).toString('base64url');

const inviteUser = async ({
  role,
  email,
  firstName,
  lastName,
  dateOfBirth,
  npiNumber,
  licenseNumber,
  specializations = [],
}) => {
  if (!INVITABLE_ROLES.includes(role)) {
    const error = new Error('role must be PHYSICIAN, CMO, or ADMIN');
    error.statusCode = 400;
    throw error;
  }

  if (!email || !firstName || !lastName) {
    const error = new Error('email, firstName, and lastName are required');
    error.statusCode = 400;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await User.findOne({ 'demographics.contactInfo.email': normalizedEmail }).lean();
  if (existing) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  const tempPassword = generateTempPassword();
  const hashedPassword = await hashPassword(tempPassword);

  const baseUser = {
    userId: crypto.randomUUID(),
    role,
    accountStatus: 'ACTIVE',
    credentials: { hashedPassword },
    demographics: {
      legalName: { first: firstName, last: lastName },
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date('1980-01-01'),
      contactInfo: {
        email: normalizedEmail,
        preferredContactMethod: 'EMAIL',
      },
    },
  };

  if (role === 'PHYSICIAN' || role === 'CMO') {
    if (!npiNumber || !licenseNumber) {
      const error = new Error('npiNumber and licenseNumber are required for clinical roles');
      error.statusCode = 400;
      throw error;
    }

    const invalidSpecializations = specializations.filter((item) => !CLINICAL_DOMAINS.includes(item));
    if (invalidSpecializations.length > 0) {
      const error = new Error(`specializations must be one of: ${CLINICAL_DOMAINS.join(', ')}`);
      error.statusCode = 400;
      throw error;
    }

    baseUser.physicianProfile = {
      npiNumber,
      licenseNumber,
      specializations,
      isCMO: role === 'CMO',
    };
  }

  const user = await User.create(baseUser);

  return {
    user: toPublicUser(user),
    tempPassword,
  };
};

const listUsers = async ({ role, accountStatus } = {}) => {
  const filter = {};
  if (role) filter.role = role;
  if (accountStatus) filter.accountStatus = accountStatus;

  const users = await User.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  return users.map((user) => {
    delete user.credentials;
    return user;
  });
};

module.exports = {
  INVITABLE_ROLES,
  inviteUser,
  listUsers,
};
