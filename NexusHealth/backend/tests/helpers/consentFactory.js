const mongoose = require('mongoose');

const buildConsentRule = (overrides = {}) => ({
  consentId: 'consent-test-001',
  versionNumber: 1,
  patientId: new mongoose.Types.ObjectId(),
  providerId: new mongoose.Types.ObjectId(),
  episodeId: 'episode-ref-cardio-001',
  permissionTier: 'VIEW_ONLY',
  allowedDomains: ['CARDIOLOGY'],
  excludedDomains: ['PSYCHIATRY'],
  status: 'PENDING_PATIENT_CONFIRMATION',
  proposedDurationDays: 90,
  ...overrides,
});

const buildActiveConsent = (overrides = {}) => {
  const grantedAt = new Date('2026-01-01T10:00:00.000Z');
  const expiresAt = new Date('2026-03-01T10:00:00.000Z');

  return buildConsentRule({
    status: 'ACTIVE',
    grantedAt,
    expiresAt,
    patientConfirmation: {
      confirmedAt: grantedAt,
      confirmedViaMethod: 'PORTAL_2FA',
      confirmingIdentityHash: 'abc123identityhash',
    },
    stateChangeLog: [
      {
        fromStatus: 'PENDING_PATIENT_CONFIRMATION',
        toStatus: 'ACTIVE',
        changedAt: grantedAt,
        changedBy: overrides.patientId || new mongoose.Types.ObjectId(),
        reason: 'Patient actively confirmed consent',
      },
    ],
    ...overrides,
  });
};

module.exports = {
  buildConsentRule,
  buildActiveConsent,
};
