// backend/models/AdrReport.js
const mongoose = require('mongoose');
const {
  ADR_REPORTED_BY,
  ADR_SEVERITIES,
  ADR_OUTCOMES,
  RECHALLENGE,
  DECHALLENGE,
} = require('../config/enums');

const ADR_REPORT_ID_PATTERN =
  /^adr-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const hasSuspectedDrugIdentity = (suspectedDrug = {}) => {
  const hasName =
    suspectedDrug.drugName && String(suspectedDrug.drugName).trim().length > 0;
  const hasCui =
    suspectedDrug.rxnormCui && String(suspectedDrug.rxnormCui).trim().length > 0;

  return hasName || hasCui;
};

const meddraTermSchema = new mongoose.Schema(
  {
    lltCode: String,
    lltTerm: String,
    ptCode: String,
    ptTerm: String,
    hlgtCode: String,
    soc: String,
  },
  { _id: false }
);

const adrReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator(value) {
          return ADR_REPORT_ID_PATTERN.test(value);
        },
        message: 'reportId must match adr-<uuid> format',
      },
    },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clinicalRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'ClinicalRecord' },
    suspectedDrug: {
      rxnormCui: String,
      drugName: String,
      lotNumber: String,
      batchNumber: String,
      ndc: String,
    },
    prescribingPhysicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    patientSymptomNarrative: String,
    meddraTerms: {
      type: [meddraTermSchema],
      default: [],
    },
    onsetDate: Date,
    reportedAt: { type: Date, required: true, default: Date.now },
    reportedBy: { type: String, enum: ADR_REPORTED_BY, required: true },
    severity: { type: String, enum: ADR_SEVERITIES, required: true },
    outcome: { type: String, enum: ADR_OUTCOMES, required: true },
    rechallenge: { type: String, enum: RECHALLENGE },
    dechallenge: { type: String, enum: DECHALLENGE },
    regulatorySubmission: {
      submittedToFda: { type: Boolean, default: false },
      faersSubmissionId: String,
      submittedAt: Date,
    },
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: 'adrReports',
    timestamps: false,
  }
);

adrReportSchema.pre('validate', function enforceAdrReportRules() {
  if (!hasSuspectedDrugIdentity(this.suspectedDrug)) {
    this.invalidate(
      'suspectedDrug',
      'suspectedDrug requires drugName or rxnormCui'
    );
  }

  if (this.onsetDate && this.reportedAt && this.onsetDate > this.reportedAt) {
    this.invalidate('onsetDate', 'onsetDate must be on or before reportedAt');
  }
});

module.exports = mongoose.model('AdrReport', adrReportSchema);
