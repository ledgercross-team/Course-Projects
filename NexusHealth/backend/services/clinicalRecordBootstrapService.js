// backend/services/clinicalRecordBootstrapService.js
const crypto = require('crypto');
const { ClinicalRecord } = require('../models');
const { isValidObjectId, toObjectId } = require('../utils/objectId');

const DEFAULT_DOMAIN = 'GENERAL_PRACTICE';

const buildRecordId = () => `rec-${crypto.randomUUID()}`;

const resolveBootstrapDomain = (consent) => {
  const allowedDomains = consent?.allowedDomains;
  if (Array.isArray(allowedDomains) && allowedDomains.length > 0) {
    return allowedDomains[0];
  }

  return DEFAULT_DOMAIN;
};

const createClinicalRecordBootstrapService = ({
  ClinicalRecordModel = ClinicalRecord,
} = {}) => {
  const ensurePatientClinicalRecord = async (
    patientId,
    { consent, prescribingPhysicianId } = {},
  ) => {
    if (!patientId || !isValidObjectId(patientId)) {
      const error = new Error('Invalid patientId');
      error.statusCode = 400;
      throw error;
    }

    const patientObjectId = toObjectId(patientId);
    const existing = await ClinicalRecordModel.findOne({ patientId: patientObjectId }).lean();

    if (existing) {
      return existing;
    }

    const record = await ClinicalRecordModel.create({
      recordId: buildRecordId(),
      patientId: patientObjectId,
      domain: resolveBootstrapDomain(consent),
      sensitivityClassification: 'STANDARD',
      recordingPhysicianId: prescribingPhysicianId || undefined,
      medications: {
        activeList: [],
        discontinuedList: [],
      },
      allergies: [],
      drugInteractionFlags: [],
    });

    return record.toObject();
  };

  return {
    buildRecordId,
    resolveBootstrapDomain,
    ensurePatientClinicalRecord,
  };
};

const defaultService = createClinicalRecordBootstrapService();

module.exports = {
  DEFAULT_DOMAIN,
  buildRecordId,
  resolveBootstrapDomain,
  createClinicalRecordBootstrapService,
  ensurePatientClinicalRecord: (...args) => defaultService.ensurePatientClinicalRecord(...args),
};
