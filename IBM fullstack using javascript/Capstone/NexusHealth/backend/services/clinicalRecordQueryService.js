// backend/services/clinicalRecordQueryService.js
const { ClinicalRecord } = require('../models');
const { toObjectId } = require('../utils/objectId');
const {
  buildConsentScopedMatch,
  buildConsentScopedPipeline,
  isRecordWithinConsentScope,
} = require('../utils/consentScope');

const listPatientRecords = async ({ clinicalReadScope, patientId }) => {
  if (clinicalReadScope.unrestricted) {
    return ClinicalRecord.find({ patientId: toObjectId(patientId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  const pipeline = buildConsentScopedPipeline(clinicalReadScope.consent, patientId, [
    { $sort: { createdAt: -1 } },
  ]);

  return ClinicalRecord.aggregate(pipeline).exec();
};

const getPatientRecordById = async ({ clinicalReadScope, patientId, recordId }) => {
  const record = await ClinicalRecord.findOne({
    recordId,
    patientId: toObjectId(patientId),
  })
    .lean()
    .exec();

  if (!record) {
    return null;
  }

  if (clinicalReadScope.unrestricted) {
    return record;
  }

  if (!isRecordWithinConsentScope(record, clinicalReadScope.consent)) {
    return null;
  }

  return record;
};

const countScopedRecords = async ({ clinicalReadScope, patientId }) => {
  if (clinicalReadScope.unrestricted) {
    return ClinicalRecord.countDocuments({ patientId: toObjectId(patientId) }).exec();
  }

  const match = buildConsentScopedMatch(clinicalReadScope.consent, patientId);
  const [result] = await ClinicalRecord.aggregate([
    { $match: match },
    { $count: 'total' },
  ]).exec();

  return result?.total ?? 0;
};

module.exports = {
  listPatientRecords,
  getPatientRecordById,
  countScopedRecords,
};
