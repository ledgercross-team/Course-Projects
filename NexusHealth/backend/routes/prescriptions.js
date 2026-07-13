// backend/routes/prescriptions.js
const express = require('express');
const { requireAuthenticatedUser, requireRole } = require('../middleware/requestIdentity');
const { assertProviderClinicalAccess } = require('../utils/providerClinicalAccess');
const {
  validatePrescription,
  validatePrescriptionBatch,
  acknowledgePrescriptionWarning,
} = require('../services/prescriptionValidationService');
const { listPatientPrescriptions } = require('../services/prescriptionListService');
const { commitPrescription } = require('../services/prescriptionCommitService');
const { discontinuePrescription } = require('../services/prescriptionDiscontinueService');
const { runPolypharmacyCheck } = require('../services/polypharmacyService');
const { UnresolvableDrugError } = require('../services/drugResolverErrors');

const router = express.Router();
const PROVIDER_ROLES = ['PHYSICIAN', 'CMO'];

router.get(
  '/mine',
  requireAuthenticatedUser,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      const result = await listPatientPrescriptions(req.authUser._id);
      return res.status(200).json(result);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

router.get(
  '/patient/:patientId',
  requireAuthenticatedUser,
  requireRole(...PROVIDER_ROLES),
  async (req, res) => {
    try {
      await assertProviderClinicalAccess(req.authUser, req.params.patientId);
      const result = await listPatientPrescriptions(req.params.patientId);
      return res.status(200).json(result);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

router.get(
  '/polypharmacy-check/:patientId',
  requireAuthenticatedUser,
  requireRole(...PROVIDER_ROLES),
  async (req, res) => {
    try {
      await assertProviderClinicalAccess(req.authUser, req.params.patientId);

      const result = await runPolypharmacyCheck(req.params.patientId);

      return res.status(200).json(result);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

router.post(
  '/validate',
  requireAuthenticatedUser,
  requireRole(...PROVIDER_ROLES),
  async (req, res) => {
    try {
      const { patientId, newDrugName, newDrugRxnormCui, icdCodeContext, dose, medications, prescriptionNote } =
        req.body || {};

      if (!patientId) {
        return res.status(400).json({ error: 'patientId is required' });
      }

      const access = await assertProviderClinicalAccess(req.authUser, patientId);

      const result = Array.isArray(medications) && medications.length > 0
        ? await validatePrescriptionBatch({
            patientId,
            medications,
            prescriptionNote,
            physicianMongoId: req.authUser._id,
            consent: access.consent,
          })
        : await validatePrescription({
            patientId,
            newDrugName,
            newDrugRxnormCui,
            icdCodeContext,
            dose,
            physicianMongoId: req.authUser._id,
            consent: access.consent,
          });

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof UnresolvableDrugError) {
        return res.status(400).json({ error: error.message, code: error.code });
      }

      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

router.post(
  '/commit',
  requireAuthenticatedUser,
  requireRole(...PROVIDER_ROLES),
  async (req, res) => {
    try {
      const { validationEventId, patientId, dose, endDate, instructions, prescriptionNote } = req.body || {};

      if (!validationEventId) {
        return res.status(400).json({ error: 'validationEventId is required' });
      }

      if (!patientId) {
        return res.status(400).json({ error: 'patientId is required' });
      }

      const access = await assertProviderClinicalAccess(req.authUser, patientId);

      const prescription = await commitPrescription({
        validationEventId,
        physicianMongoId: req.authUser._id,
        dose,
        endDate,
        instructions: instructions || prescriptionNote,
        consent: access.consent,
      });

      return res.status(201).json({ prescription });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

router.post(
  '/discontinue',
  requireAuthenticatedUser,
  requireRole(...PROVIDER_ROLES),
  async (req, res) => {
    try {
      const { patientId, recordId, rxnormCui, discontinuedReason } = req.body || {};

      if (!patientId) {
        return res.status(400).json({ error: 'patientId is required' });
      }

      await assertProviderClinicalAccess(req.authUser, patientId);

      const result = await discontinuePrescription({
        patientId,
        recordId,
        rxnormCui,
        physicianMongoId: req.authUser._id,
        discontinuedReason,
      });

      return res.status(200).json(result);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

router.post(
  '/:validationEventId/acknowledge',
  requireAuthenticatedUser,
  requireRole(...PROVIDER_ROLES),
  async (req, res) => {
    try {
      const { acknowledgementJustification } = req.body || {};

      const result = await acknowledgePrescriptionWarning({
        validationEventId: req.params.validationEventId,
        acknowledgementJustification,
        physicianMongoId: req.authUser._id,
      });

      return res.status(200).json(result);
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  },
);

module.exports = router;
