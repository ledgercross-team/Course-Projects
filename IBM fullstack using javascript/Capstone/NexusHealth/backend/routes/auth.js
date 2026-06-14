// backend/routes/auth.js
const express = require('express');
const { requireAuthenticatedUser } = require('../middleware/requestIdentity');
const { authRateLimit } = require('../middleware/authRateLimit');
const {
  REFRESH_COOKIE_NAME,
  registerPatient,
  loginWithEmail,
  issueAuthTokens,
  refreshAuthTokens,
  logoutUser,
  toPublicUser,
  getCookieOptions,
} = require('../services/authService');
const { User } = require('../models');
const { ensurePatientMrn } = require('../services/mrnService');
const {
  updateMyProfile,
  changeMyPassword,
  deleteMyAccount,
} = require('../services/profileService');

const router = express.Router();

router.post('/register', authRateLimit, async (req, res) => {
  try {
    const user = await registerPatient(req.body);
    const { accessToken, refreshToken } = await issueAuthTokens(user);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());
    return res.status(201).json({
      accessToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.post('/login', authRateLimit, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await loginWithEmail({ email, password });
    const { accessToken, refreshToken } = await issueAuthTokens(user);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());
    return res.status(200).json({
      accessToken,
      user: toPublicUser(user),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.post('/refresh', authRateLimit, async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token missing' });
    }

    const { accessToken, refreshToken: rotatedRefresh } = await refreshAuthTokens(refreshToken);
    res.cookie(REFRESH_COOKIE_NAME, rotatedRefresh, getCookieOptions());
    return res.status(200).json({ accessToken });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.post('/logout', requireAuthenticatedUser, async (req, res) => {
  try {
    await logoutUser(req.authUser.userId);
    res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());
    return res.status(200).json({ success: true });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.get('/me', requireAuthenticatedUser, async (req, res) => {
  try {
    const user = await User.findById(req.authUser._id)
      .populate('patientProfile.primaryPhysicianId', 'demographics physicianProfile role userId')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'PATIENT') {
      const mrn = await ensurePatientMrn(user);
      user.patientProfile = { ...(user.patientProfile || {}), mrn };
    }

    delete user.credentials;
    return res.status(200).json({ user });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.patch('/me', requireAuthenticatedUser, async (req, res) => {
  try {
    const user = await updateMyProfile(req.authUser._id, {
      primaryPhone: req.body.primaryPhone,
    });

    if (user.role === 'PATIENT') {
      const mrn = await ensurePatientMrn(user);
      user.patientProfile = { ...(user.patientProfile || {}), mrn };
    }

    return res.status(200).json({ user });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.post('/change-password', requireAuthenticatedUser, async (req, res) => {
  try {
    const result = await changeMyPassword(req.authUser._id, {
      currentPassword: req.body.currentPassword,
      newPassword: req.body.newPassword,
    });
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/me', requireAuthenticatedUser, async (req, res) => {
  try {
    const result = await deleteMyAccount(req.authUser._id, {
      password: req.body.password,
    });
    res.clearCookie(REFRESH_COOKIE_NAME, getCookieOptions());
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

module.exports = router;
