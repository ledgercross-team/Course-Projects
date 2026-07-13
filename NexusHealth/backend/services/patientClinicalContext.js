// backend/services/patientClinicalContext.js
const { User, ClinicalRecord } = require('../models');
const { isValidObjectId, toObjectId } = require('../utils/objectId');
const { ensurePatientClinicalRecord } = require('./clinicalRecordBootstrapService');

const loadPatientClinicalContext = async (
  patientId,
  {
    UserModel = User,
    ClinicalRecordModel = ClinicalRecord,
    ensurePatientClinicalRecordImpl = ensurePatientClinicalRecord,
    consent,
    prescribingPhysicianId,
    autoBootstrap = false,
  } = {},
) => {
  if (!patientId || !isValidObjectId(patientId)) {
    const error = new Error('Invalid patientId');
    error.statusCode = 400;
    throw error;
  }

  const patientObjectId = toObjectId(patientId);
  const patient = await UserModel.findOne({ _id: patientObjectId, role: 'PATIENT' }).lean();

  if (!patient) {
    const error = new Error('Invalid patientId');
    error.statusCode = 400;
    throw error;
  }

  let records = await ClinicalRecordModel.find({ patientId: patientObjectId })
    .sort({ recordId: 1 })
    .lean();

  if (records.length === 0) {
    if (!autoBootstrap) {
      const error = new Error('No clinical record found for patient');
      error.statusCode = 400;
      throw error;
    }

    await ensurePatientClinicalRecordImpl(patientObjectId, {
      consent,
      prescribingPhysicianId,
    });

    records = await ClinicalRecordModel.find({ patientId: patientObjectId })
      .sort({ recordId: 1 })
      .lean();

    if (records.length === 0) {
      const error = new Error('No clinical record found for patient');
      error.statusCode = 400;
      throw error;
    }
  }

  const activeMedications = [];
  const seenRxCuIs = new Set();

  for (const record of records) {
    for (const medication of record.medications?.activeList || []) {
      if (medication.rxnormCui && !seenRxCuIs.has(medication.rxnormCui)) {
        seenRxCuIs.add(medication.rxnormCui);
        activeMedications.push({
          ...medication,
          sourceRecordId: record.recordId,
        });
      }
    }
  }

  const allergies = records.flatMap((record) => record.allergies || []);

  return {
    patientObjectId,
    records,
    activeMedications,
    allergies,
  };
};

const findClinicalRecordForInteractionFlag = (
  records,
  { newDrugRxnormCui, conflictingDrugRxnormCui }
) => {
  if (!Array.isArray(records) || records.length === 0) {
    return null;
  }

  const hasActiveDrug = (record, rxnormCui) =>
    (record.medications?.activeList || []).some(
      (medication) => medication.rxnormCui === rxnormCui
    );

  if (conflictingDrugRxnormCui) {
    const matchingConflict = records.find((record) =>
      hasActiveDrug(record, conflictingDrugRxnormCui)
    );
    if (matchingConflict) {
      return matchingConflict;
    }
  }

  if (newDrugRxnormCui) {
    const matchingNewDrug = records.find((record) => hasActiveDrug(record, newDrugRxnormCui));
    if (matchingNewDrug) {
      return matchingNewDrug;
    }
  }

  return records[0];
};

module.exports = {
  loadPatientClinicalContext,
  findClinicalRecordForInteractionFlag,
};
