// backend/services/adrReportService.js
const crypto = require('crypto');
const { AdrReport, ClinicalRecord } = require('../models');
const {
  ADR_SEVERITIES,
  ADR_OUTCOMES,
  RECHALLENGE,
  DECHALLENGE,
} = require('../config/enums');
const { appendAuditLog } = require('../utils/auditLogWriter');
const { toObjectId } = require('../utils/objectId');
const { validateMeddraTerms } = require('../utils/validateMeddraTerms');
const { normalizeSuspectedDrug } = require('./adrDrugNormalizer');

const ROLE_TO_REPORTED_BY = {
  PATIENT: 'PATIENT',
  PHYSICIAN: 'PHYSICIAN',
  PHARMACIST: 'PHARMACIST',
};

const REGULATORY_ELIGIBLE_SEVERITIES = ['SERIOUS', 'LIFE_THREATENING', 'FATAL'];

const buildReportId = () => `adr-${crypto.randomUUID()}`;
const buildFaersSubmissionId = () => `faers-local-${crypto.randomUUID()}`;

const assertEnumValue = (fieldName, value, allowedValues, required = false) => {
  if (value === undefined || value === null || value === '') {
    if (required) {
      const error = new Error(`${fieldName} is required`);
      error.statusCode = 400;
      throw error;
    }
    return undefined;
  }

  if (!allowedValues.includes(value)) {
    const error = new Error(`Invalid ${fieldName}`);
    error.statusCode = 400;
    throw error;
  }

  return value;
};

const mapReporterRole = (role) => {
  const reportedBy = ROLE_TO_REPORTED_BY[role];

  if (!reportedBy) {
    const error = new Error('Role is not authorized to submit ADR reports');
    error.statusCode = 403;
    throw error;
  }

  return reportedBy;
};

const createAdrReportService = ({
  normalizeSuspectedDrugImpl = normalizeSuspectedDrug,
  validateMeddraTermsImpl = validateMeddraTerms,
  appendAuditLogImpl = appendAuditLog,
  AdrReportModel = AdrReport,
  ClinicalRecordModel = ClinicalRecord,
} = {}) => {
  const createAdrReport = async ({ reporterUser, payload }) => {
    if (!reporterUser?._id) {
      const error = new Error('Reporter user is required');
      error.statusCode = 401;
      throw error;
    }

    const reportedBy = mapReporterRole(reporterUser.role);
    const patientObjectId = toObjectId(payload?.patientId);

    assertEnumValue('severity', payload?.severity, ADR_SEVERITIES, true);
    assertEnumValue('outcome', payload?.outcome, ADR_OUTCOMES, true);
    assertEnumValue('rechallenge', payload?.rechallenge, RECHALLENGE);
    assertEnumValue('dechallenge', payload?.dechallenge, DECHALLENGE);

    const meddraValidation = validateMeddraTermsImpl(payload?.meddraTerms);
    if (!meddraValidation.valid) {
      const error = new Error(meddraValidation.errors.join('; '));
      error.statusCode = 400;
      throw error;
    }

    const normalizedDrug = await normalizeSuspectedDrugImpl(payload?.suspectedDrug || {});

    const reportedAt = new Date();
    const reportId = buildReportId();

    let clinicalRecordObjectId;
    if (payload?.clinicalRecordId) {
      clinicalRecordObjectId = toObjectId(payload.clinicalRecordId);

      const clinicalRecord = await ClinicalRecordModel.findById(clinicalRecordObjectId).lean();

      if (!clinicalRecord || clinicalRecord.patientId.toString() !== patientObjectId.toString()) {
        const error = new Error('Clinical record not found');
        error.statusCode = 404;
        throw error;
      }
    }

    let prescribingPhysicianId = payload?.prescribingPhysicianId
      ? toObjectId(payload.prescribingPhysicianId)
      : undefined;

    if (!prescribingPhysicianId && reporterUser.role === 'PHYSICIAN') {
      prescribingPhysicianId = reporterUser._id;
    }

    const reportDocument = {
      reportId,
      patientId: patientObjectId,
      clinicalRecordId: clinicalRecordObjectId,
      suspectedDrug: normalizedDrug,
      prescribingPhysicianId,
      patientSymptomNarrative: payload?.patientSymptomNarrative,
      meddraTerms: payload.meddraTerms,
      onsetDate: payload?.onsetDate ? new Date(payload.onsetDate) : undefined,
      reportedAt,
      reportedBy,
      severity: payload.severity,
      outcome: payload.outcome,
      rechallenge: payload?.rechallenge,
      dechallenge: payload?.dechallenge,
    };

    const report = await AdrReportModel.create(reportDocument);

    if (clinicalRecordObjectId) {
      const updateResult = await ClinicalRecordModel.updateOne(
        { _id: clinicalRecordObjectId },
        { $push: { adrReportIds: report._id } }
      );

      if (updateResult.matchedCount === 0) {
        await AdrReportModel.deleteOne({ _id: report._id });

        const error = new Error('Clinical record not found');
        error.statusCode = 404;
        throw error;
      }
    }

    await appendAuditLogImpl({
      eventType: 'ADR_REPORTED',
      actorId: reporterUser._id,
      targetResourceType: 'AdrReport',
      targetResourceId: report.reportId,
      payload: {
        patientId: patientObjectId.toString(),
        reportedBy,
        severity: report.severity,
        suspectedDrugRxnormCui: report.suspectedDrug?.rxnormCui,
        clinicalRecordId: clinicalRecordObjectId?.toString(),
      },
    });

    return report.toObject();
  };

  const getAdrReportById = async (reportId) => {
    if (!reportId || String(reportId).trim().length === 0) {
      const error = new Error('reportId is required');
      error.statusCode = 400;
      throw error;
    }

    return AdrReportModel.findOne({ reportId: String(reportId).trim() }).lean();
  };

  const listAdrReportsForPatient = async (patientId, { limit = 50, offset = 0 } = {}) => {
    const patientObjectId = toObjectId(patientId);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const safeOffset = Math.max(Number(offset) || 0, 0);

    return AdrReportModel.find({ patientId: patientObjectId })
      .sort({ reportedAt: -1 })
      .skip(safeOffset)
      .limit(safeLimit)
      .lean();
  };

  const submitRegulatoryReport = async ({ reportId, actorUser }) => {
    if (!actorUser?._id) {
      const error = new Error('Actor user is required');
      error.statusCode = 401;
      throw error;
    }

    const report = await AdrReportModel.findOne({ reportId: String(reportId).trim() });

    if (!report) {
      const error = new Error('ADR report not found');
      error.statusCode = 404;
      throw error;
    }

    if (!REGULATORY_ELIGIBLE_SEVERITIES.includes(report.severity)) {
      const error = new Error('Only serious ADR reports may be submitted for regulatory review');
      error.statusCode = 409;
      throw error;
    }

    if (report.regulatorySubmission?.submittedToFda === true) {
      const error = new Error('ADR report has already been submitted for regulatory review');
      error.statusCode = 409;
      throw error;
    }

    const submittedAt = new Date();
    const faersSubmissionId = buildFaersSubmissionId();

    report.regulatorySubmission = {
      submittedToFda: true,
      faersSubmissionId,
      submittedAt,
    };

    await report.save();

    await appendAuditLogImpl({
      eventType: 'ADR_REGULATORY_SUBMITTED',
      actorId: actorUser._id,
      targetResourceType: 'AdrReport',
      targetResourceId: report.reportId,
      payload: {
        patientId: report.patientId.toString(),
        severity: report.severity,
        faersSubmissionId,
        submittedAt: submittedAt.toISOString(),
      },
    });

    return report.toObject();
  };

  return {
    createAdrReport,
    getAdrReportById,
    listAdrReportsForPatient,
    submitRegulatoryReport,
  };
};

const defaultService = createAdrReportService();

module.exports = {
  createAdrReportService,
  createAdrReport: defaultService.createAdrReport,
  getAdrReportById: defaultService.getAdrReportById,
  listAdrReportsForPatient: defaultService.listAdrReportsForPatient,
  submitRegulatoryReport: defaultService.submitRegulatoryReport,
};
