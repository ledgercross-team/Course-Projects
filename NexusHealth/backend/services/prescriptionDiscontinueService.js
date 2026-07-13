// backend/services/prescriptionDiscontinueService.js
const { ClinicalRecord } = require('../models');
const { appendAuditLog } = require('../utils/auditLogWriter');
const { isValidObjectId, toObjectId } = require('../utils/objectId');

const discontinuePrescription = async ({
  patientId,
  recordId,
  rxnormCui,
  physicianMongoId,
  discontinuedReason = 'Discontinued by prescriber',
}) => {
  if (!patientId || !isValidObjectId(patientId)) {
    const error = new Error('A valid patientId is required');
    error.statusCode = 400;
    throw error;
  }

  if (!recordId?.trim()) {
    const error = new Error('recordId is required');
    error.statusCode = 400;
    throw error;
  }

  if (!rxnormCui?.trim()) {
    const error = new Error('rxnormCui is required');
    error.statusCode = 400;
    throw error;
  }

  const clinicalRecord = await ClinicalRecord.findOne({
    recordId: recordId.trim(),
    patientId: toObjectId(patientId),
  }).exec();

  if (!clinicalRecord) {
    const error = new Error('Clinical record not found');
    error.statusCode = 404;
    throw error;
  }

  const activeList = clinicalRecord.medications?.activeList || [];
  const medicationIndex = activeList.findIndex(
    (medication) => medication.rxnormCui === rxnormCui.trim(),
  );

  if (medicationIndex === -1) {
    const error = new Error('Active prescription not found');
    error.statusCode = 404;
    throw error;
  }

  const medication = activeList[medicationIndex];

  if (medication.prescribedBy?.toString() !== physicianMongoId.toString()) {
    const error = new Error('Only the prescribing physician may discontinue this medication');
    error.statusCode = 403;
    throw error;
  }

  const discontinuedAt = new Date();
  clinicalRecord.medications.activeList.splice(medicationIndex, 1);
  clinicalRecord.medications.discontinuedList.push({
    rxnormCui: medication.rxnormCui,
    drugName: medication.drugName,
    discontinuedAt,
    discontinuedReason: String(discontinuedReason).trim(),
  });

  await clinicalRecord.save();

  await appendAuditLog({
    eventType: 'PRESCRIPTION_DISCONTINUED',
    actorId: physicianMongoId,
    targetResourceType: 'Prescription',
    targetResourceId: `${recordId}:${rxnormCui}`,
    payload: {
      patientId,
      recordId,
      rxnormCui: medication.rxnormCui,
      drugName: medication.drugName,
      discontinuedAt: discontinuedAt.toISOString(),
      discontinuedReason: String(discontinuedReason).trim(),
    },
  });

  return {
    patientId,
    recordId,
    rxnormCui: medication.rxnormCui,
    drugName: medication.drugName,
    discontinuedAt,
  };
};

module.exports = {
  discontinuePrescription,
};
