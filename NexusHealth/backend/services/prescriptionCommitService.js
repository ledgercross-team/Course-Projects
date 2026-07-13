// backend/services/prescriptionCommitService.js
const crypto = require('crypto');
const { ClinicalRecord, AuditLog } = require('../models');
const { appendAuditLog } = require('../utils/auditLogWriter');
const { loadPatientClinicalContext } = require('./patientClinicalContext');

const buildPrescriptionId = () => `rx-${crypto.randomUUID()}`;

const selectTargetClinicalRecord = (records, consent) => {
  const allowedDomains = consent?.allowedDomains || [];
  const domainMatch = records.find((record) => allowedDomains.includes(record.domain));
  return domainMatch || records[0];
};

const assertValidationReadyToCommit = async (validationEventId, physicianMongoId, AuditLogModel = AuditLog) => {
  const validationAudit = await AuditLogModel.findOne({
    targetResourceId: validationEventId,
    eventType: 'PRESCRIPTION_VALIDATED',
  }).lean();

  if (!validationAudit) {
    const error = new Error('Validation event not found');
    error.statusCode = 404;
    throw error;
  }

  if (validationAudit.actorId.toString() !== physicianMongoId.toString()) {
    const error = new Error('Only the validating physician may commit this prescription');
    error.statusCode = 403;
    throw error;
  }

  const decision = validationAudit.payload?.decision;
  if (decision === 'SOFT_WARNING' || decision === 'HARD_STOP') {
    const ack = await AuditLogModel.findOne({
      targetResourceId: validationEventId,
      eventType: 'PRESCRIPTION_ACKNOWLEDGED',
    }).lean();

    if (!ack) {
      const error = new Error(`${decision} must be acknowledged before commit`);
      error.statusCode = 409;
      throw error;
    }
  }

  const existingCommit = await AuditLogModel.findOne({
    targetResourceId: validationEventId,
    eventType: 'PRESCRIPTION_COMMITTED',
  }).lean();

  if (existingCommit) {
    const error = new Error('This validation has already been committed');
    error.statusCode = 409;
    throw error;
  }

  return validationAudit;
};

const commitMedicationEntries = async ({
  clinicalRecord,
  validationAudit,
  physicianMongoId,
  dose,
  endDate,
  instructions,
}) => {
  const batchMedications = validationAudit.payload?.medications;
  const prescriptionNote = validationAudit.payload?.prescriptionNote?.trim() || undefined;
  const sharedInstructions = instructions?.trim() || prescriptionNote;

  if (Array.isArray(batchMedications) && batchMedications.length > 0) {
    const prescribedAt = new Date();
    const prescriptionId = buildPrescriptionId();
    const committed = [];

    for (const medication of batchMedications) {
      const rxnormCui = medication.newDrugRxnormCui;
      const drugName = medication.newDrugName;
      const alreadyActive = (clinicalRecord.medications?.activeList || []).some(
        (entry) => entry.rxnormCui === rxnormCui,
      );

      if (alreadyActive) {
        const error = new Error(`${drugName} is already on the patient active medication list`);
        error.statusCode = 409;
        throw error;
      }

      const medicationEntry = {
        rxnormCui,
        drugName,
        dose: medication.dose,
        instructions: sharedInstructions,
        prescriptionId,
        prescribedBy: physicianMongoId,
        prescribedAt,
        endDate: endDate ? new Date(endDate) : undefined,
      };

      clinicalRecord.medications.activeList.push(medicationEntry);
      committed.push({
        prescriptionId,
        rxnormCui,
        drugName,
        dose: medicationEntry.dose,
        instructions: medicationEntry.instructions,
        prescribedAt,
        endDate: medicationEntry.endDate,
      });
    }

    await clinicalRecord.save();
    return committed;
  }

  const rxnormCui = validationAudit.payload.newDrugRxnormCui;
  const drugName = validationAudit.payload.newDrugName;
  const alreadyActive = (clinicalRecord.medications?.activeList || []).some(
    (medication) => medication.rxnormCui === rxnormCui,
  );

  if (alreadyActive) {
    const error = new Error('This drug is already on the patient active medication list');
    error.statusCode = 409;
    throw error;
  }

  const prescribedAt = new Date();
  const prescriptionId = buildPrescriptionId();
  const medicationEntry = {
    rxnormCui,
    drugName,
    dose: dose || validationAudit.payload.dose,
    instructions: sharedInstructions,
    prescriptionId,
    prescribedBy: physicianMongoId,
    prescribedAt,
    endDate: endDate ? new Date(endDate) : undefined,
  };

  clinicalRecord.medications.activeList.push(medicationEntry);
  await clinicalRecord.save();

  return [
    {
      prescriptionId,
      rxnormCui,
      drugName,
      dose: medicationEntry.dose,
      instructions: medicationEntry.instructions,
      prescribedAt,
      endDate: medicationEntry.endDate,
    },
  ];
};

const commitPrescription = async ({
  validationEventId,
  physicianMongoId,
  dose,
  endDate,
  instructions,
  consent,
}) => {
  if (!validationEventId?.trim()) {
    const error = new Error('validationEventId is required');
    error.statusCode = 400;
    throw error;
  }

  const validationAudit = await assertValidationReadyToCommit(validationEventId, physicianMongoId);
  const patientId = validationAudit.payload.patientId;
  const { records } = await loadPatientClinicalContext(patientId, {
    consent,
    autoBootstrap: true,
  });

  const targetRecordSnapshot = selectTargetClinicalRecord(records, consent);
  const clinicalRecord = await ClinicalRecord.findOne({
    recordId: targetRecordSnapshot.recordId,
    patientId,
  }).exec();

  if (!clinicalRecord) {
    const error = new Error('Clinical record not found for patient');
    error.statusCode = 404;
    throw error;
  }

  const committedMedications = await commitMedicationEntries({
    clinicalRecord,
    validationAudit,
    physicianMongoId,
    dose,
    endDate,
    instructions,
  });

  const prescriptionId = committedMedications[0]?.prescriptionId || buildPrescriptionId();

  await appendAuditLog({
    eventType: 'PRESCRIPTION_COMMITTED',
    actorId: physicianMongoId,
    targetResourceType: 'Prescription',
    targetResourceId: validationEventId,
    payload: {
      prescriptionId,
      patientId,
      recordId: clinicalRecord.recordId,
      prescriptionNote: validationAudit.payload?.prescriptionNote,
      medications: committedMedications.map((medication) => ({
        rxnormCui: medication.rxnormCui,
        drugName: medication.drugName,
        dose: medication.dose,
        instructions: medication.instructions,
        prescribedAt: medication.prescribedAt.toISOString(),
        endDate: medication.endDate?.toISOString(),
      })),
      rxnormCui: committedMedications[0]?.rxnormCui,
      drugName: committedMedications[0]?.drugName,
      dose: committedMedications[0]?.dose,
      prescribedAt: committedMedications[0]?.prescribedAt.toISOString(),
    },
  });

  if (committedMedications.length === 1) {
    const [medication] = committedMedications;
    return {
      prescriptionId,
      validationEventId,
      patientId,
      recordId: clinicalRecord.recordId,
      rxnormCui: medication.rxnormCui,
      drugName: medication.drugName,
      dose: medication.dose,
      instructions: medication.instructions,
      prescribedAt: medication.prescribedAt,
      endDate: medication.endDate,
    };
  }

  return {
    prescriptionId,
    validationEventId,
    patientId,
    recordId: clinicalRecord.recordId,
    prescriptions: committedMedications.map((medication) => ({
      rxnormCui: medication.rxnormCui,
      drugName: medication.drugName,
      dose: medication.dose,
      instructions: medication.instructions,
      prescribedAt: medication.prescribedAt,
      endDate: medication.endDate,
    })),
  };
};

module.exports = {
  buildPrescriptionId,
  selectTargetClinicalRecord,
  assertValidationReadyToCommit,
  commitMedicationEntries,
  commitPrescription,
};
