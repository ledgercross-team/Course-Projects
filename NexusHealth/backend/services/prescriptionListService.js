// backend/services/prescriptionListService.js
const { User, ClinicalRecord } = require('../models');
const { isValidObjectId, toObjectId } = require('../utils/objectId');

const formatPrescriber = (user) => {
  if (!user) return null;
  const first = user.demographics?.legalName?.first || '';
  const last = user.demographics?.legalName?.last || '';
  return {
    id: user._id.toString(),
    displayName: `Dr. ${first} ${last}`.trim(),
  };
};

const mapInteractionWarnings = (medication, flags) =>
  flags
    .filter(
      (flag) =>
        flag.offendingDrugRxnormCui === medication.rxnormCui ||
        flag.conflictingDrugRxnormCui === medication.rxnormCui,
    )
    .map((flag) => ({
      tier: flag.tier,
      mechanism: flag.interactionMechanism,
      overrideJustification: flag.acknowledgementJustification,
      offendingDrugRxnormCui: flag.offendingDrugRxnormCui,
      conflictingDrugRxnormCui: flag.conflictingDrugRxnormCui,
      acknowledgedAt: flag.acknowledgedAt,
    }));

const buildInteractionWarningKey = (warning) => {
  const pair = [warning.offendingDrugRxnormCui, warning.conflictingDrugRxnormCui]
    .filter(Boolean)
    .sort()
    .join('+');
  return `${pair}:${warning.mechanism || ''}:${warning.tier || ''}`;
};

const dedupeInteractionWarnings = (warnings) => {
  const seen = new Set();
  return warnings.filter((warning) => {
    const key = buildInteractionWarningKey(warning);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildMedicationEntry = (medication, record, prescriberById, flags) => ({
  rxnormCui: medication.rxnormCui,
  drugName: medication.drugName,
  dose: medication.dose,
  instructions: medication.instructions,
  prescriptionId: medication.prescriptionId,
  prescribedAt: medication.prescribedAt,
  endDate: medication.endDate,
  ndc: medication.ndc,
  recordId: record.recordId,
  clinicalDomain: record.domain,
  prescribedBy: formatPrescriber(prescriberById[medication.prescribedBy?.toString()]),
  interactionWarnings: mapInteractionWarnings(medication, flags),
});

const buildOrderGroupKey = (medication, recordId) => {
  if (medication.prescriptionId) {
    return medication.prescriptionId;
  }

  const prescriberId = medication.prescribedBy?.toString() || 'unknown';
  const prescribedAt = medication.prescribedAt
    ? new Date(medication.prescribedAt).toISOString()
    : 'unknown';

  return `legacy:${recordId}:${prescriberId}:${prescribedAt}`;
};

const flattenActivePrescriptions = (records, prescriberById) =>
  records.flatMap((record) => {
    const flags = record.drugInteractionFlags || [];
    return (record.medications?.activeList || []).map((medication) =>
      buildMedicationEntry(medication, record, prescriberById, flags),
    );
  });

const groupPrescriptionOrders = (prescriptions) => {
  const orderMap = new Map();

  for (const medication of prescriptions) {
    const groupKey = buildOrderGroupKey(
      {
        prescriptionId: medication.prescriptionId,
        prescribedBy: medication.prescribedBy?.id,
        prescribedAt: medication.prescribedAt,
      },
      medication.recordId,
    );

    if (!orderMap.has(groupKey)) {
      orderMap.set(groupKey, {
        prescriptionId: medication.prescriptionId || groupKey,
        recordId: medication.recordId,
        clinicalDomain: medication.clinicalDomain,
        prescribedAt: medication.prescribedAt,
        prescribedBy: medication.prescribedBy,
        instructions: medication.instructions,
        medications: [],
      });
    }

    const order = orderMap.get(groupKey);
    order.medications.push(medication);

    if (!order.instructions && medication.instructions) {
      order.instructions = medication.instructions;
    }
  }

  const orders = [...orderMap.values()].map((order) => {
    const mergedWarnings = order.medications.flatMap((med) => med.interactionWarnings || []);
    const interactionWarnings = dedupeInteractionWarnings(mergedWarnings);

    return {
      ...order,
      medicationCount: order.medications.length,
      interactionWarnings,
    };
  });

  orders.sort((a, b) => new Date(b.prescribedAt || 0) - new Date(a.prescribedAt || 0));

  return orders;
};

const listPatientPrescriptions = async (patientId) => {
  if (!patientId || !isValidObjectId(patientId)) {
    const error = new Error('A valid patientId is required');
    error.statusCode = 400;
    throw error;
  }

  const patientObjectId = toObjectId(patientId);
  const records = await ClinicalRecord.find({ patientId: patientObjectId })
    .sort({ createdAt: -1 })
    .lean();

  const prescriberIds = new Set();
  for (const record of records) {
    for (const medication of record.medications?.activeList || []) {
      if (medication.prescribedBy) {
        prescriberIds.add(medication.prescribedBy.toString());
      }
    }
  }

  const prescribers = prescriberIds.size
    ? await User.find({ _id: { $in: [...prescriberIds] } }).lean()
    : [];

  const prescriberById = Object.fromEntries(
    prescribers.map((user) => [user._id.toString(), user]),
  );

  const prescriptions = flattenActivePrescriptions(records, prescriberById).sort(
    (a, b) => new Date(b.prescribedAt || 0) - new Date(a.prescribedAt || 0),
  );

  const prescriptionOrders = groupPrescriptionOrders(prescriptions);

  return { patientId: patientObjectId.toString(), prescriptions, prescriptionOrders };
};

module.exports = {
  formatPrescriber,
  buildMedicationEntry,
  buildOrderGroupKey,
  buildInteractionWarningKey,
  dedupeInteractionWarnings,
  flattenActivePrescriptions,
  groupPrescriptionOrders,
  listPatientPrescriptions,
};
