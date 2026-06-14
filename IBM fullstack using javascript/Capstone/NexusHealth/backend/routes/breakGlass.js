// backend/routes/breakGlass.js
const express = require('express');
const { requireAuthenticatedUser, requireRole } = require('../middleware/requestIdentity');
const {
  executeBreakGlassOverride,
  initiateTier1SoftOverride,
  initiateTier2Request,
  listPendingComplianceQueue,
  listPatientBreakGlassAlerts,
  approveTier2Request,
  denyTier2Request,
  getTier2RequestStatus,
} = require('../services/breakGlassService');

const router = express.Router();

router.post(
  '/override',
  requireAuthenticatedUser,
  requireRole('PHYSICIAN'),
  async (req, res) => {
    try {
      const result = await executeBreakGlassOverride({
        initiatedBy: req.authUser._id,
        targetPatientId: req.body.targetPatientId,
        clinicalJustificationCode: req.body.clinicalJustificationCode,
        freeTextReason: req.body.freeTextReason,
        icdCodeContext: req.body.icdCodeContext,
        affectedDomains: req.body.affectedDomains,
        notificationChannel: req.body.notificationChannel,
      });

      const statusCode = result.tier === 'TIER_2_HARD_OVERRIDE' ? 202 : 201;

      return res.status(statusCode).json({
        tier: result.tier,
        breakGlass: result.breakGlassLog,
        sessionExpiresAt: result.sessionExpiresAt ?? null,
        escalationDueBy: result.escalationDueBy,
        reviewStatus: result.reviewStatus ?? null,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

router.post(
  '/tier1',
  requireAuthenticatedUser,
  requireRole('PHYSICIAN'),
  async (req, res) => {
    try {
      const result = await initiateTier1SoftOverride({
        physicianMongoId: req.authUser._id,
        targetPatientId: req.body.targetPatientId,
        clinicalJustificationCode: req.body.clinicalJustificationCode,
        freeTextReason: req.body.freeTextReason,
        icdCodeContext: req.body.icdCodeContext,
        affectedDomains: req.body.affectedDomains,
        notificationChannel: req.body.notificationChannel,
      });

      return res.status(201).json({
        breakGlass: result.breakGlassLog,
        sessionExpiresAt: result.sessionExpiresAt,
        escalationDueBy: result.escalationDueBy,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.post(
  '/tier2',
  requireAuthenticatedUser,
  requireRole('PHYSICIAN'),
  async (req, res) => {
    try {
      const result = await initiateTier2Request({
        physicianMongoId: req.authUser._id,
        targetPatientId: req.body.targetPatientId,
        clinicalJustificationCode: req.body.clinicalJustificationCode,
        freeTextReason: req.body.freeTextReason,
        icdCodeContext: req.body.icdCodeContext,
        affectedDomains: req.body.affectedDomains,
        notificationChannel: req.body.notificationChannel,
      });

      return res.status(202).json({
        breakGlass: result.breakGlassLog,
        reviewStatus: result.reviewStatus,
        escalationDueBy: result.escalationDueBy,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.get(
  '/patient/alerts',
  requireAuthenticatedUser,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      const alerts = await listPatientBreakGlassAlerts({
        patientId: req.authUser._id,
      });

      return res.status(200).json({
        count: alerts.length,
        alerts,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

router.get(
  '/compliance-queue',
  requireAuthenticatedUser,
  requireRole('CMO'),
  async (req, res) => {
    try {
      const pending = await listPendingComplianceQueue();

      return res.status(200).json({
        count: pending.length,
        requests: pending,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.get(
  '/:eventId/status',
  requireAuthenticatedUser,
  requireRole('PHYSICIAN', 'CMO'),
  async (req, res) => {
    try {
      const status = await getTier2RequestStatus(req.params.eventId);

      return res.status(200).json({
        requestEventId: status.request.eventId,
        reviewStatus: status.reviewStatus,
        sessionExpiresAt: status.sessionExpiresAt,
        request: status.request,
        resolution: status.resolution,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.post(
  '/:eventId/approve',
  requireAuthenticatedUser,
  requireRole('CMO'),
  async (req, res) => {
    try {
      const result = await approveTier2Request({
        requestEventId: req.params.eventId,
        cmoMongoId: req.authUser._id,
        retrospectiveReviewFlag: req.body?.retrospectiveReviewFlag,
        reviewOutcome: req.body?.reviewOutcome,
      });

      return res.status(200).json({
        requestEventId: result.request.eventId,
        approvalEventId: result.approvalLog.eventId,
        reviewStatus: result.reviewStatus,
        sessionExpiresAt: result.sessionExpiresAt,
        approval: result.approvalLog,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.post(
  '/:eventId/deny',
  requireAuthenticatedUser,
  requireRole('CMO'),
  async (req, res) => {
    try {
      const result = await denyTier2Request({
        requestEventId: req.params.eventId,
        cmoMongoId: req.authUser._id,
        reviewOutcome: req.body?.reviewOutcome,
      });

      return res.status(200).json({
        requestEventId: result.request.eventId,
        denialEventId: result.denialLog.eventId,
        reviewStatus: result.reviewStatus,
        denial: result.denialLog,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

module.exports = router;
