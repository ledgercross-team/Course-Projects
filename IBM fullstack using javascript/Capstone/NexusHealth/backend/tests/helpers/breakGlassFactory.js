const mongoose = require('mongoose');
const { sealAuditEvent } = require('../../utils/sealAuditEvent');

const buildTier1BreakGlass = (overrides = {}) => ({
  eventId: 'breakglass-test-001',
  tier: 'TIER_1_SOFT_OVERRIDE',
  initiatedBy: new mongoose.Types.ObjectId(),
  targetPatientId: new mongoose.Types.ObjectId(),
  affectedDomains: ['CARDIOLOGY', 'PSYCHIATRY'],
  justification: {
    clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
    freeTextReason: 'Patient arrived unconscious in ED',
    icdCodeContext: 'R40.20',
  },
  complianceEscalation: {
    escalatedToQueueAt: new Date('2026-06-13T10:00:00.000Z'),
    escalationQueueId: 'queue-001',
    reviewStatus: 'PENDING',
  },
  patientNotification: {
    notificationSentAt: new Date('2026-06-13T10:00:00.000Z'),
    notificationChannel: 'PORTAL_ALERT',
    notificationDelivered: false,
  },
  signatureHash: sealAuditEvent({
    eventId: 'breakglass-test-001',
    tier: 'TIER_1_SOFT_OVERRIDE',
  }),
  eventCreatedAt: new Date('2026-06-13T10:00:00.000Z'),
  ...overrides,
});

const buildTier2Request = (overrides = {}) => ({
  eventId: 'breakglass-req-test-001',
  tier: 'TIER_2_HARD_OVERRIDE',
  recordPhase: 'REQUEST',
  initiatedBy: new mongoose.Types.ObjectId(),
  targetPatientId: new mongoose.Types.ObjectId(),
  affectedDomains: ['ONCOLOGY'],
  justification: {
    clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
    freeTextReason: 'Suspected sepsis requiring full chart review',
    icdCodeContext: 'A41.9',
  },
  complianceEscalation: {
    escalatedToQueueAt: new Date('2026-06-13T10:00:00.000Z'),
    escalationQueueId: 'queue-tier2-001',
    reviewStatus: 'PENDING',
  },
  patientNotification: {
    notificationSentAt: new Date('2026-06-13T10:00:00.000Z'),
    notificationChannel: 'EMAIL',
    notificationDelivered: false,
  },
  signatureHash: sealAuditEvent({
    eventId: 'breakglass-req-test-001',
    tier: 'TIER_2_HARD_OVERRIDE',
    recordPhase: 'REQUEST',
  }),
  eventCreatedAt: new Date('2026-06-13T10:00:00.000Z'),
  ...overrides,
});

const buildTier2Approval = (overrides = {}) => {
  const requestEventId = overrides.requestEventId || 'breakglass-req-test-001';
  const eventId = overrides.eventId || 'breakglass-appr-test-001';
  const authorizedByCmoId =
    overrides.tier2Authorization?.authorizedByCmoId || new mongoose.Types.ObjectId();
  const authorizedAt =
    overrides.tier2Authorization?.authorizedAt || new Date('2026-06-13T11:00:00.000Z');

  return {
    eventId,
    tier: 'TIER_2_HARD_OVERRIDE',
    recordPhase: 'APPROVAL',
    requestEventId,
    initiatedBy: new mongoose.Types.ObjectId(),
    targetPatientId: new mongoose.Types.ObjectId(),
    affectedDomains: ['ONCOLOGY'],
    justification: {
      clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
      freeTextReason: 'Suspected sepsis requiring full chart review',
    },
    tier2Authorization: {
      authorizedByCmoId,
      authorizedAt,
      retrospectiveReviewFlag: true,
      reviewDueBy: new Date('2026-06-20T11:00:00.000Z'),
    },
    complianceEscalation: {
      escalatedToQueueAt: new Date('2026-06-13T10:00:00.000Z'),
      escalationQueueId: 'queue-tier2-001',
      reviewStatus: 'CLEARED',
      reviewedBy: authorizedByCmoId,
      reviewedAt: authorizedAt,
      reviewOutcome: 'APPROVED_EMERGENCY_ACCESS',
    },
    signatureHash: sealAuditEvent({
      eventId,
      tier: 'TIER_2_HARD_OVERRIDE',
      recordPhase: 'APPROVAL',
      requestEventId,
    }),
    eventCreatedAt: authorizedAt,
    ...overrides,
  };
};

module.exports = {
  buildTier1BreakGlass,
  buildTier2Request,
  buildTier2Approval,
};
