// backend/routes/consent.js
const express = require('express');
const { requireAuthenticatedUser, requireRole } = require('../middleware/requestIdentity');
const {
  createConsentDraft,
  confirmConsent,
  revokeConsent,
  requestRenewal,
  expireConsents,
  listConsentsForPatient,
  listProviderConsentReports,
} = require('../services/consentService');

const router = express.Router();

router.get(
  '/mine',
  requireAuthenticatedUser,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      const consents = await listConsentsForPatient(req.authUser._id);
      return res.status(200).json({ consents });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.get(
  '/provider/mine',
  requireAuthenticatedUser,
  requireRole('PHYSICIAN', 'CMO'),
  async (req, res) => {
    try {
      const consents = await listProviderConsentReports(req.authUser._id, {
        mrn: req.query.mrn,
      });
      return res.status(200).json({ consents });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

router.post(
  '/',
  requireAuthenticatedUser,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      const consent = await createConsentDraft({
        patientMongoId: req.authUser._id,
        providerId: req.body.providerId,
        permissionTier: req.body.permissionTier,
        allowedDomains: req.body.allowedDomains,
        excludedDomains: req.body.excludedDomains,
        episodeId: req.body.episodeId,
        durationDays: req.body.durationDays,
        consentOrigin: req.body.consentOrigin,
      });

      return res.status(201).json({ consent });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.post(
  '/expire',
  requireAuthenticatedUser,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const asOf = req.body.asOf ? new Date(req.body.asOf) : new Date();
      const results = await expireConsents({ asOf });

      return res.status(200).json({
        expiredCount: results.length,
        expirations: results.map(({ consent, notification }) => ({
          consentId: consent.consentId,
          versionNumber: consent.versionNumber,
          status: consent.status,
          notification,
        })),
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.post(
  '/:consentId/confirm',
  requireAuthenticatedUser,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      const consent = await confirmConsent({
        consentId: req.params.consentId,
        patientMongoId: req.authUser._id,
        confirmedViaMethod: req.body.confirmedViaMethod,
        durationDays: req.body.durationDays,
      });

      return res.status(200).json({ consent });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.post(
  '/:consentId/revoke',
  requireAuthenticatedUser,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      const consent = await revokeConsent({
        consentId: req.params.consentId,
        patientMongoId: req.authUser._id,
        revokedReason: req.body.revokedReason,
      });

      return res.status(200).json({ consent });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.post(
  '/:consentId/renew',
  requireAuthenticatedUser,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      const renewalDraft = await requestRenewal({
        consentId: req.params.consentId,
        patientMongoId: req.authUser._id,
        durationDays: req.body.durationDays,
      });

      return res.status(201).json({ consent: renewalDraft });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

module.exports = router;
