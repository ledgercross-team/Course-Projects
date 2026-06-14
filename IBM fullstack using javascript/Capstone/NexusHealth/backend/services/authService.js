// backend/services/authService.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, PASSWORD_MIN_LENGTH } = require('../models');
const { ensurePatientMrn, generateUniqueMrn } = require('./mrnService');

const BCRYPT_ROUNDS = 10;
const REFRESH_COOKIE_NAME = 'refreshToken';

const getAccessSecret = () => process.env.JWT_SECRET || 'dev-access-secret-change-me';
const getRefreshSecret = () => process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'dev-refresh-secret-change-me';
const getAccessTtl = () => process.env.JWT_ACCESS_TTL || '15m';
const getRefreshTtl = () => process.env.JWT_REFRESH_TTL || '7d';

const buildUserId = () => crypto.randomUUID();

const normalizeEmail = (email) => email?.trim().toLowerCase();

const hashPassword = async (password) => bcrypt.hash(password, BCRYPT_ROUNDS);

const verifyPassword = async (password, hashedPassword) => bcrypt.compare(password, hashedPassword);

const toPublicUser = (user) => {
  const doc = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  delete doc.credentials;
  return doc;
};

const signAccessToken = (user) =>
  jwt.sign(
    {
      sub: user.userId,
      role: user.role,
      accountStatus: user.accountStatus,
    },
    getAccessSecret(),
    { expiresIn: getAccessTtl(), jwtid: crypto.randomUUID() },
  );

const signRefreshToken = (user) => {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      sub: user.userId,
      type: 'refresh',
    },
    getRefreshSecret(),
    { expiresIn: getRefreshTtl(), jwtid: jti },
  );

  return { token, jti };
};

const verifyAccessToken = (token) => jwt.verify(token, getAccessSecret());

const verifyRefreshToken = (token) => jwt.verify(token, getRefreshSecret());

const validatePassword = (password) => {
  if (!password || typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    const error = new Error(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    error.statusCode = 400;
    throw error;
  }
};

const findUserByEmail = async (email, { includePassword = false } = {}) => {
  const query = User.findOne({ 'demographics.contactInfo.email': normalizeEmail(email) });
  if (includePassword) {
    query.select('+credentials');
  }
  return query.exec();
};

const registerPatient = async ({
  email,
  password,
  firstName,
  lastName,
  dateOfBirth,
  primaryPhysicianId,
  biologicalSex,
}) => {
  validatePassword(password);

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !firstName || !lastName || !dateOfBirth) {
    const error = new Error('email, password, firstName, lastName, and dateOfBirth are required');
    error.statusCode = 400;
    throw error;
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    const error = new Error('An account with this email already exists');
    error.statusCode = 409;
    throw error;
  }

  if (primaryPhysicianId) {
    const provider = await User.findById(primaryPhysicianId).lean();
    if (!provider || !['PHYSICIAN', 'CMO'].includes(provider.role) || provider.accountStatus !== 'ACTIVE') {
      const error = new Error('primaryPhysicianId must reference an active physician or CMO');
      error.statusCode = 400;
      throw error;
    }
  }

  const hashedPassword = await hashPassword(password);
  const mrn = await generateUniqueMrn();
  const user = await User.create({
    userId: buildUserId(),
    role: 'PATIENT',
    accountStatus: 'ACTIVE',
    credentials: { hashedPassword },
    demographics: {
      legalName: { first: firstName, last: lastName },
      dateOfBirth: new Date(dateOfBirth),
      biologicalSex,
      contactInfo: {
        email: normalizedEmail,
        preferredContactMethod: 'EMAIL',
      },
    },
    patientProfile: {
      mrn,
      primaryPhysicianId: primaryPhysicianId || undefined,
      careTeamPhysicianIds: primaryPhysicianId ? [primaryPhysicianId] : [],
    },
  });

  return user;
};

const loginWithEmail = async ({ email, password }) => {
  const user = await findUserByEmail(email, { includePassword: true });
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const valid = await verifyPassword(password, user.credentials.hashedPassword);
  if (!valid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  if (user.accountStatus !== 'ACTIVE') {
    const error = new Error('Account is not active');
    error.statusCode = 403;
    throw error;
  }

  if (user.role === 'PATIENT') {
    await ensurePatientMrn(user);
    const refreshedPatient = await User.findById(user._id).lean();
    delete refreshedPatient.credentials;
    return refreshedPatient;
  }

  delete user.credentials;
  return user;
};

const issueAuthTokens = async (user) => {
  const accessToken = signAccessToken(user);
  const { token: refreshToken, jti } = signRefreshToken(user);

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        'credentials.lastAuthenticatedAt': new Date(),
        'credentials.authSessionToken': jti,
      },
    },
  );

  return { accessToken, refreshToken };
};

const refreshAuthTokens = async (refreshToken) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  if (payload.type !== 'refresh') {
    const error = new Error('Invalid refresh token');
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findOne({ userId: payload.sub })
    .select('+credentials')
    .exec();

  if (!user || user.accountStatus !== 'ACTIVE') {
    const error = new Error('Authenticated user not found');
    error.statusCode = 401;
    throw error;
  }

  if (!user.credentials?.authSessionToken || user.credentials.authSessionToken !== payload.jti) {
    const error = new Error('Refresh token has been revoked');
    error.statusCode = 401;
    throw error;
  }

  return issueAuthTokens(user);
};

const logoutUser = async (userId) => {
  await User.updateOne(
    { userId },
    { $unset: { 'credentials.authSessionToken': '' } },
  );
};

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

module.exports = {
  REFRESH_COOKIE_NAME,
  PASSWORD_MIN_LENGTH,
  MIN_PASSWORD_LENGTH: PASSWORD_MIN_LENGTH,
  normalizeEmail,
  hashPassword,
  verifyPassword,
  toPublicUser,
  signAccessToken,
  verifyAccessToken,
  verifyRefreshToken,
  registerPatient,
  loginWithEmail,
  issueAuthTokens,
  refreshAuthTokens,
  logoutUser,
  getCookieOptions,
  findUserByEmail,
  validatePassword,
};
