// backend/tests/helpers/adrReportFactory.js
const crypto = require('crypto');
const mongoose = require('mongoose');

const buildReportId = () => `adr-${crypto.randomUUID()}`;

const buildAdrReport = (overrides = {}) => {
  const reportedAt = overrides.reportedAt || new Date('2026-06-13T12:00:00.000Z');

  return {
    reportId: buildReportId(),
    patientId: new mongoose.Types.ObjectId(),
    suspectedDrug: {
      drugName: 'Aspirin',
      rxnormCui: '1191',
    },
    reportedAt,
    reportedBy: 'PATIENT',
    severity: 'NON_SERIOUS',
    outcome: 'UNKNOWN',
    meddraTerms: [],
    ...overrides,
  };
};

module.exports = {
  buildReportId,
  buildAdrReport,
};
