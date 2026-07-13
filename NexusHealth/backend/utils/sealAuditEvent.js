// backend/utils/sealAuditEvent.js
const crypto = require('crypto');

const DEV_AUDIT_SEAL_SECRET = 'dev-audit-seal-secret';

const normalizeValue = (value) => {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object' && typeof value.toHexString === 'function') {
    return value.toHexString();
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

const buildDeterministicPayload = (payload) => {
  const sealed = {};

  for (const key of Object.keys(payload).sort()) {
    sealed[key] = normalizeValue(payload[key]);
  }

  return sealed;
};

const resolveAuditSealSecret = () => {
  if (process.env.AUDIT_SEAL_SECRET) {
    return process.env.AUDIT_SEAL_SECRET;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUDIT_SEAL_SECRET is required in production');
  }

  return DEV_AUDIT_SEAL_SECRET;
};

const sealAuditEvent = (payload, secret = resolveAuditSealSecret()) => {
  const canonical = JSON.stringify(buildDeterministicPayload(payload));
  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
};

const verifyAuditEventSeal = (payload, signatureHash, secret = resolveAuditSealSecret()) => {
  if (!signatureHash) {
    return false;
  }

  return sealAuditEvent(payload, secret) === signatureHash;
};

const buildTier1SealPayload = ({
  eventId,
  initiatedBy,
  targetPatientId,
  clinicalJustificationCode,
  freeTextReason,
  icdCodeContext,
  affectedDomains,
  eventCreatedAt,
}) => ({
  eventId,
  tier: 'TIER_1_SOFT_OVERRIDE',
  initiatedBy: initiatedBy.toString(),
  targetPatientId: targetPatientId.toString(),
  clinicalJustificationCode,
  freeTextReason: freeTextReason.trim(),
  icdCodeContext: icdCodeContext || null,
  affectedDomains,
  eventCreatedAt:
    eventCreatedAt instanceof Date ? eventCreatedAt.toISOString() : eventCreatedAt,
});

const buildTier2RequestSealPayload = ({
  eventId,
  initiatedBy,
  targetPatientId,
  clinicalJustificationCode,
  freeTextReason,
  icdCodeContext,
  affectedDomains,
  eventCreatedAt,
}) => ({
  eventId,
  tier: 'TIER_2_HARD_OVERRIDE',
  recordPhase: 'REQUEST',
  initiatedBy: initiatedBy.toString(),
  targetPatientId: targetPatientId.toString(),
  clinicalJustificationCode,
  freeTextReason: freeTextReason.trim(),
  icdCodeContext: icdCodeContext || null,
  affectedDomains,
  eventCreatedAt:
    eventCreatedAt instanceof Date ? eventCreatedAt.toISOString() : eventCreatedAt,
});

const buildTier2ApprovalSealPayload = ({
  eventId,
  requestEventId,
  initiatedBy,
  targetPatientId,
  authorizedByCmoId,
  authorizedAt,
  clinicalJustificationCode,
  freeTextReason,
  eventCreatedAt,
}) => ({
  eventId,
  tier: 'TIER_2_HARD_OVERRIDE',
  recordPhase: 'APPROVAL',
  requestEventId,
  initiatedBy: initiatedBy.toString(),
  targetPatientId: targetPatientId.toString(),
  authorizedByCmoId: authorizedByCmoId.toString(),
  authorizedAt: authorizedAt instanceof Date ? authorizedAt.toISOString() : authorizedAt,
  clinicalJustificationCode,
  freeTextReason: freeTextReason.trim(),
  eventCreatedAt:
    eventCreatedAt instanceof Date ? eventCreatedAt.toISOString() : eventCreatedAt,
});

const buildTier2DenialSealPayload = ({
  eventId,
  requestEventId,
  initiatedBy,
  targetPatientId,
  reviewedBy,
  reviewedAt,
  reviewOutcome,
  eventCreatedAt,
}) => ({
  eventId,
  tier: 'TIER_2_HARD_OVERRIDE',
  recordPhase: 'DENIAL',
  requestEventId,
  initiatedBy: initiatedBy.toString(),
  targetPatientId: targetPatientId.toString(),
  reviewedBy: reviewedBy.toString(),
  reviewedAt: reviewedAt instanceof Date ? reviewedAt.toISOString() : reviewedAt,
  reviewOutcome,
  eventCreatedAt:
    eventCreatedAt instanceof Date ? eventCreatedAt.toISOString() : eventCreatedAt,
});

const verifyLogIntegrity = verifyAuditEventSeal;

const toPlainBreakGlassLog = (log) => (log?.toObject ? log.toObject() : log);

const rebuildSealPayloadFromBreakGlassLog = (log) => {
  const doc = toPlainBreakGlassLog(log);

  if (!doc?.tier) {
    throw new Error('Break-glass log tier is required to rebuild seal payload');
  }

  if (doc.tier === 'TIER_1_SOFT_OVERRIDE') {
    return buildTier1SealPayload({
      eventId: doc.eventId,
      initiatedBy: doc.initiatedBy,
      targetPatientId: doc.targetPatientId,
      clinicalJustificationCode: doc.justification.clinicalJustificationCode,
      freeTextReason: doc.justification.freeTextReason,
      icdCodeContext: doc.justification.icdCodeContext,
      affectedDomains: doc.affectedDomains,
      eventCreatedAt: doc.eventCreatedAt,
    });
  }

  if (doc.tier === 'TIER_2_HARD_OVERRIDE' && doc.recordPhase === 'REQUEST') {
    return buildTier2RequestSealPayload({
      eventId: doc.eventId,
      initiatedBy: doc.initiatedBy,
      targetPatientId: doc.targetPatientId,
      clinicalJustificationCode: doc.justification.clinicalJustificationCode,
      freeTextReason: doc.justification.freeTextReason,
      icdCodeContext: doc.justification.icdCodeContext,
      affectedDomains: doc.affectedDomains,
      eventCreatedAt: doc.eventCreatedAt,
    });
  }

  if (doc.tier === 'TIER_2_HARD_OVERRIDE' && doc.recordPhase === 'APPROVAL') {
    return buildTier2ApprovalSealPayload({
      eventId: doc.eventId,
      requestEventId: doc.requestEventId,
      initiatedBy: doc.initiatedBy,
      targetPatientId: doc.targetPatientId,
      authorizedByCmoId: doc.tier2Authorization.authorizedByCmoId,
      authorizedAt: doc.tier2Authorization.authorizedAt,
      clinicalJustificationCode: doc.justification.clinicalJustificationCode,
      freeTextReason: doc.justification.freeTextReason,
      eventCreatedAt: doc.eventCreatedAt,
    });
  }

  if (doc.tier === 'TIER_2_HARD_OVERRIDE' && doc.recordPhase === 'DENIAL') {
    return buildTier2DenialSealPayload({
      eventId: doc.eventId,
      requestEventId: doc.requestEventId,
      initiatedBy: doc.initiatedBy,
      targetPatientId: doc.targetPatientId,
      reviewedBy: doc.complianceEscalation.reviewedBy,
      reviewedAt: doc.complianceEscalation.reviewedAt,
      reviewOutcome: doc.complianceEscalation.reviewOutcome,
      eventCreatedAt: doc.eventCreatedAt,
    });
  }

  throw new Error(
    `Cannot rebuild seal payload for tier=${doc.tier} recordPhase=${doc.recordPhase || 'none'}`,
  );
};

const verifyBreakGlassLogIntegrity = (log, secret = resolveAuditSealSecret()) => {
  const doc = toPlainBreakGlassLog(log);

  if (!doc?.signatureHash) {
    return false;
  }

  const payload = rebuildSealPayloadFromBreakGlassLog(doc);
  return verifyLogIntegrity(payload, doc.signatureHash, secret);
};

module.exports = {
  DEV_AUDIT_SEAL_SECRET,
  normalizeValue,
  buildDeterministicPayload,
  resolveAuditSealSecret,
  sealAuditEvent,
  verifyAuditEventSeal,
  verifyLogIntegrity,
  rebuildSealPayloadFromBreakGlassLog,
  verifyBreakGlassLogIntegrity,
  buildTier1SealPayload,
  buildTier2RequestSealPayload,
  buildTier2ApprovalSealPayload,
  buildTier2DenialSealPayload,
};
