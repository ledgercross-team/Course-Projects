// backend/routes/users.js
const express = require('express');
const { User } = require('../models');
const { requireAuthenticatedUser, requireRole } = require('../middleware/requestIdentity');
const { searchProviders } = require('../services/userLookupService');
const { ensurePatientMrn } = require('../services/mrnService');
const {
  listCareTeamDoctors,
  addCareTeamDoctor,
  removeCareTeamDoctor,
} = require('../services/patientCareTeamService');

const router = express.Router();

router.get('/providers/search', async (req, res) => {
  try {
    const providers = await searchProviders(req.query.q);
    return res.status(200).json({ providers });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.get('/me', requireAuthenticatedUser, requireRole('PATIENT'), async (req, res) => {
  try {
    const freshUser = await User.findById(req.authUser._id).lean();
    const mrn = await ensurePatientMrn(freshUser);
    const first = freshUser?.demographics?.legalName?.first || '';
    const last = freshUser?.demographics?.legalName?.last || '';

    return res.status(200).json({
      mrn,
      displayName: [first, last].filter(Boolean).join(' '),
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.get('/me/doctors', requireAuthenticatedUser, requireRole('PATIENT'), async (req, res) => {
  try {
    const freshUser = await User.findById(req.authUser._id).lean();
    const doctors = await listCareTeamDoctors(freshUser);
    return res.status(200).json({ doctors });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.post('/me/doctors', requireAuthenticatedUser, requireRole('PATIENT'), async (req, res) => {
  try {
    const { physicianId } = req.body || {};
    if (!physicianId) {
      return res.status(400).json({ error: 'physicianId is required' });
    }

    const freshUser = await User.findById(req.authUser._id).lean();
    const doctors = await addCareTeamDoctor(freshUser, physicianId);
    return res.status(201).json({ doctors });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

router.delete('/me/doctors/:physicianId', requireAuthenticatedUser, requireRole('PATIENT'), async (req, res) => {
  try {
    const freshUser = await User.findById(req.authUser._id).lean();
    const doctors = await removeCareTeamDoctor(freshUser, req.params.physicianId);
    return res.status(200).json({ doctors });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ error: error.message });
  }
});

module.exports = router;
