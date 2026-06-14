// backend/routes/adrReports.js
const express = require('express');
const { requireAuthenticatedUser, requireRole } = require('../middleware/requestIdentity');
const { assertAdrSubmitAccess, assertAdrReadAccess } = require('../utils/adrSubmitAccess');
const { assertProviderClinicalAccess } = require('../utils/providerClinicalAccess');
const {
  createAdrReport,
  getAdrReportById,
  listAdrReportsForPatient,
  submitRegulatoryReport,
} = require('../services/adrReportService');
const { UnresolvableDrugError } = require('../services/drugResolverErrors');

const router = express.Router();

router.post(
  '/',
  requireAuthenticatedUser,
  requireRole('PATIENT', 'PHYSICIAN', 'PHARMACIST'),
  async (req, res) => {
    try {
      const body = req.body || {};
      const { patientId } = body;

      await assertAdrSubmitAccess(req.authUser, patientId);

      const report = await createAdrReport({
        reporterUser: req.authUser,
        payload: body,
      });

      return res.status(201).json({ report });
    } catch (error) {
      if (error instanceof UnresolvableDrugError) {
        return res.status(400).json({ error: error.message, code: error.code });
      }

      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.get(
  '/patient/:patientId',
  requireAuthenticatedUser,
  requireRole('PATIENT', 'PHYSICIAN', 'CMO', 'PHARMACIST'),
  async (req, res) => {
    try {
      await assertAdrReadAccess(req.authUser, req.params.patientId);

      const reports = await listAdrReportsForPatient(req.params.patientId);

      return res.status(200).json({
        patientId: req.params.patientId,
        count: reports.length,
        reports,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.post(
  '/:reportId/submit-regulatory',
  requireAuthenticatedUser,
  requireRole('PHYSICIAN', 'CMO'),
  async (req, res) => {
    try {
      const existingReport = await getAdrReportById(req.params.reportId);

      if (!existingReport) {
        return res.status(404).json({ error: 'ADR report not found' });
      }

      await assertProviderClinicalAccess(req.authUser, existingReport.patientId.toString());

      const report = await submitRegulatoryReport({
        reportId: req.params.reportId,
        actorUser: req.authUser,
      });

      return res.status(200).json({
        reportId: report.reportId,
        faersSubmissionId: report.regulatorySubmission.faersSubmissionId,
        submittedAt: report.regulatorySubmission.submittedAt,
        report,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.get(
  '/:reportId',
  requireAuthenticatedUser,
  requireRole('PATIENT', 'PHYSICIAN', 'CMO', 'PHARMACIST'),
  async (req, res) => {
    try {
      const report = await getAdrReportById(req.params.reportId);

      if (!report) {
        return res.status(404).json({ error: 'ADR report not found' });
      }

      if (
        req.authUser.role === 'PATIENT' &&
        report.patientId.toString() !== req.authUser._id.toString()
      ) {
        return res.status(404).json({ error: 'ADR report not found' });
      }

      await assertAdrReadAccess(req.authUser, report.patientId.toString());

      return res.status(200).json({ report });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

module.exports = router;
