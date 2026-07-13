// backend/routes/clinicalRecords.js
const express = require('express');
const { requireAuthenticatedUser } = require('../middleware/requestIdentity');
const { resolveClinicalReadScope } = require('../middleware/consentScope');
const {
  listPatientRecords,
  getPatientRecordById,
} = require('../services/clinicalRecordQueryService');

const router = express.Router();

router.get(
  '/patient/:patientId',
  requireAuthenticatedUser,
  resolveClinicalReadScope,
  async (req, res) => {
    try {
      const records = await listPatientRecords({
        clinicalReadScope: req.clinicalReadScope,
        patientId: req.params.patientId,
      });

      return res.status(200).json({
        patientId: req.params.patientId,
        scope: req.clinicalReadScope.type,
        count: records.length,
        records,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

router.get(
  '/patient/:patientId/record/:recordId',
  requireAuthenticatedUser,
  resolveClinicalReadScope,
  async (req, res) => {
    try {
      const record = await getPatientRecordById({
        clinicalReadScope: req.clinicalReadScope,
        patientId: req.params.patientId,
        recordId: req.params.recordId,
      });

      if (!record) {
        return res.status(404).json({ error: 'Clinical record not found' });
      }

      return res.status(200).json({ record });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({ error: error.message });
    }
  }
);

module.exports = router;
