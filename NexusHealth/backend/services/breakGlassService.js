// backend/services/breakGlassService.js
const crypto = require('crypto');
const mongoose = require('mongoose');
const { BreakGlassAuditLog, User } = require('../models');
const {
  CLINICAL_JUSTIFICATION_CODES,
  CLINICAL_DOMAINS,
  NOTIFICATION_CHANNELS,
  COMPLIANCE_ESCALATION_SLA_HOURS,
  BREAK_GLASS_TIER1_SESSION_HOURS,
  BREAK_GLASS_TIER2_SESSION_HOURS,
  BREAK_GLASS_TIER2_RETROSPECTIVE_REVIEW_DAYS,
} = require('../config/enums');
const { appendAuditLog } = require('../utils/auditLogWriter');
const {
  sealAuditEvent,
  buildTier1SealPayload,
  buildTier2RequestSealPayload,
  buildTier2ApprovalSealPayload,
  buildTier2DenialSealPayload,
} = require('../utils/sealAuditEvent');
const { isValidObjectId, toObjectId } = require('../utils/objectId');
const {
  resolvePatientNotificationChannel,
  scheduleBreakGlassNotification,
} = require('./breakGlassNotificationService');
const {
  checkAccessPermission,
  getDomainSensitivity,
  resolveRequiredTier,
  SENSITIVITY_RANK,
} = require('./breakGlassAuthorizationService');

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MIN_FREE_TEXT_REASON_LENGTH = 20;

const resolveMaxSensitivityForDomains = async (targetPatientId, affectedDomains) => {
  const patientObjectId = toObjectId(targetPatientId);
  const sensitivities = await Promise.all(
    affectedDomains.map((domain) => getDomainSensitivity(patientObjectId, domain)),
  );

  return sensitivities.reduce(
    (highest, current) =>
      SENSITIVITY_RANK[current] > SENSITIVITY_RANK[highest] ? current : highest,
    'STANDARD',
  );
};

const buildTier1ComplianceEscalation = ({ eventCreatedAt, maxSensitivity }) => {
  const complianceEscalation = {
    escalatedToQueueAt: eventCreatedAt,
    escalationQueueId: buildEscalationQueueId(),
    reviewStatus: 'PENDING',
  };

  if (maxSensitivity === 'SENSITIVE' || maxSensitivity === 'HIGHLY_SENSITIVE') {
    complianceEscalation.reviewDueBy = new Date(
      eventCreatedAt.getTime() + BREAK_GLASS_TIER2_RETROSPECTIVE_REVIEW_DAYS * MS_PER_DAY,
    );
  }

  return complianceEscalation;
};

const runBreakGlassInitiationTransaction = async (writeOperation) => {
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await writeOperation(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

const buildEventId = (prefix = 'breakglass') => `${prefix}-${crypto.randomUUID()}`;
const buildEscalationQueueId = () => `compliance-queue-${crypto.randomUUID()}`;

const buildHttpError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

class IncompleteJustificationError extends Error {
  constructor(message = `freeTextReason must be at least ${MIN_FREE_TEXT_REASON_LENGTH} characters`) {
    super(message);
    this.name = 'IncompleteJustificationError';
    this.statusCode = 400;
    this.code = 'INCOMPLETE_JUSTIFICATION';
  }
}

const validateBreakGlassPayload = ({
  targetPatientId,
  clinicalJustificationCode,
  freeTextReason,
  affectedDomains,
  notificationChannel,
}) => {
  const errors = [];

  if (!targetPatientId || !isValidObjectId(targetPatientId)) {
    errors.push('targetPatientId must be a valid ObjectId');
  }

  if (!clinicalJustificationCode) {
    errors.push('clinicalJustificationCode is required');
  } else if (!CLINICAL_JUSTIFICATION_CODES.includes(clinicalJustificationCode)) {
    errors.push('clinicalJustificationCode is invalid');
  }

  if (!freeTextReason || freeTextReason.trim().length < MIN_FREE_TEXT_REASON_LENGTH) {
    errors.push(
      `freeTextReason must be at least ${MIN_FREE_TEXT_REASON_LENGTH} characters`,
    );
  }

  if (affectedDomains) {
    if (!Array.isArray(affectedDomains) || affectedDomains.length === 0) {
      errors.push('affectedDomains must be a non-empty array when provided');
    } else if (affectedDomains.some((domain) => !CLINICAL_DOMAINS.includes(domain))) {
      errors.push('affectedDomains contains an invalid clinical domain');
    }
  }

  if (notificationChannel && !NOTIFICATION_CHANNELS.includes(notificationChannel)) {
    errors.push('notificationChannel is invalid');
  }

  return errors;
};

const assertPhysician = async (physicianMongoId) => {
  const physician = await User.findById(physicianMongoId).lean();

  if (!physician || physician.role !== 'PHYSICIAN') {
    throw buildHttpError('Break-glass may only be initiated by a physician', 403);
  }

  return physician;
};

const assertPatient = async (targetPatientId) => {
  const patient = await User.findById(targetPatientId).lean();

  if (!patient || patient.role !== 'PATIENT') {
    throw buildHttpError('targetPatientId must reference a patient', 400);
  }

  return patient;
};

const assertCmo = async (cmoMongoId) => {
  const cmo = await User.findById(cmoMongoId).lean();

  if (!cmo || cmo.role !== 'CMO') {
    throw buildHttpError('Tier 2 approval may only be performed by a CMO', 403);
  }

  return cmo;
};

const getTier2Request = async (requestEventId) => {
  const request = await BreakGlassAuditLog.findOne({
    eventId: requestEventId,
    tier: 'TIER_2_HARD_OVERRIDE',
    recordPhase: 'REQUEST',
  }).exec();

  if (!request) {
    throw buildHttpError('Tier 2 break-glass request not found', 404);
  }

  return request;
};

const getTier2Resolution = async (requestEventId) =>
  BreakGlassAuditLog.findOne({
    requestEventId,
    tier: 'TIER_2_HARD_OVERRIDE',
    recordPhase: { $in: ['APPROVAL', 'DENIAL'] },
  }).exec();

const resolveTierForDomains = async (targetPatientId, affectedDomains) => {
  const patientObjectId = toObjectId(targetPatientId);
  const sensitivities = await Promise.all(
    affectedDomains.map((domain) => getDomainSensitivity(patientObjectId, domain)),
  );

  const maxSensitivity = sensitivities.reduce(
    (highest, current) =>
      SENSITIVITY_RANK[current] > SENSITIVITY_RANK[highest] ? current : highest,
    'STANDARD',
  );

  return resolveRequiredTier(maxSensitivity);
};

const executeBreakGlassOverride = async ({
  initiatedBy,
  targetPatientId,
  clinicalJustificationCode,
  freeTextReason,
  icdCodeContext,
  affectedDomains = CLINICAL_DOMAINS,
  notificationChannel,
}) => {
  const validationErrors = validateBreakGlassPayload({
    targetPatientId,
    clinicalJustificationCode,
    freeTextReason,
    affectedDomains,
    notificationChannel,
  });

  if (validationErrors.length > 0) {
    const message = validationErrors.join('; ');
    if (message.includes('freeTextReason must be at least')) {
      throw new IncompleteJustificationError(message);
    }
    throw buildHttpError(message, 400);
  }

  const domains = affectedDomains.length > 0 ? affectedDomains : CLINICAL_DOMAINS;
  const primaryDomain = domains[0];
  const access = await checkAccessPermission(initiatedBy, targetPatientId, primaryDomain);

  if (access.allowed) {
    const message =
      access.source === 'CONSENT'
        ? 'Access already authorized via patient consent'
        : 'An active break-glass session already exists';
    throw buildHttpError(message, 409);
  }

  if (!access.breakGlassEligible) {
    throw buildHttpError('Break-glass may only be initiated by a physician', 403);
  }

  const requiredTier = await resolveTierForDomains(targetPatientId, domains);

  const commonPayload = {
    physicianMongoId: initiatedBy,
    targetPatientId,
    clinicalJustificationCode,
    freeTextReason,
    icdCodeContext,
    affectedDomains: domains,
    notificationChannel,
  };

  if (requiredTier === 'TIER_2_HARD_OVERRIDE') {
    const result = await initiateTier2Request(commonPayload);
    return { tier: 'TIER_2_HARD_OVERRIDE', ...result };
  }

  const result = await initiateTier1SoftOverride(commonPayload);
  return { tier: 'TIER_1_SOFT_OVERRIDE', ...result };
};

const initiateTier1SoftOverride = async ({
  physicianMongoId,
  targetPatientId,
  clinicalJustificationCode,
  freeTextReason,
  icdCodeContext,
  affectedDomains = CLINICAL_DOMAINS,
  notificationChannel,
}) => {
  const validationErrors = validateBreakGlassPayload({
    targetPatientId,
    clinicalJustificationCode,
    freeTextReason,
    affectedDomains,
    notificationChannel,
  });

  if (validationErrors.length > 0) {
    throw buildHttpError(validationErrors.join('; '), 400);
  }

  await Promise.all([assertPhysician(physicianMongoId), assertPatient(targetPatientId)]);

  const patient = await User.findById(targetPatientId).lean();
  const resolvedChannel = resolvePatientNotificationChannel(patient, notificationChannel);
  const maxSensitivity = await resolveMaxSensitivityForDomains(targetPatientId, affectedDomains);

  const eventCreatedAt = new Date();
  const escalatedToQueueAt = eventCreatedAt;
  const escalationDueBy = new Date(
    eventCreatedAt.getTime() + COMPLIANCE_ESCALATION_SLA_HOURS * MS_PER_HOUR
  );
  const eventId = buildEventId();

  const signatureHash = sealAuditEvent(
    buildTier1SealPayload({
      eventId,
      initiatedBy: physicianMongoId,
      targetPatientId,
      clinicalJustificationCode,
      freeTextReason,
      icdCodeContext,
      affectedDomains,
      eventCreatedAt,
    })
  );

  const breakGlassLog = await runBreakGlassInitiationTransaction(async (session) => {
    const [createdLog] = await BreakGlassAuditLog.create(
      [
        {
          eventId,
          tier: 'TIER_1_SOFT_OVERRIDE',
          initiatedBy: physicianMongoId,
          targetPatientId,
          affectedDomains,
          justification: {
            clinicalJustificationCode,
            freeTextReason: freeTextReason.trim(),
            icdCodeContext,
          },
          patientNotification: {
            notificationSentAt: eventCreatedAt,
            notificationChannel: resolvedChannel,
            notificationDelivered: false,
          },
          complianceEscalation: buildTier1ComplianceEscalation({ eventCreatedAt, maxSensitivity }),
          accessReport: {
            reportAvailableForPatientDispute: true,
          },
          signatureHash,
          eventCreatedAt,
        },
      ],
      { session },
    );

    await appendAuditLog(
      {
        eventType: 'BREAK_GLASS_INITIATED',
        actorId: physicianMongoId,
        targetResourceType: 'BreakGlassAuditLog',
        targetResourceId: eventId,
        payload: {
          tier: 'TIER_1_SOFT_OVERRIDE',
          targetPatientId: targetPatientId.toString(),
          clinicalJustificationCode,
          escalationDueBy: escalationDueBy.toISOString(),
          notification: {
            patientId: targetPatientId.toString(),
            channel: resolvedChannel,
            notifyParties: ['PATIENT'],
          },
        },
      },
      { session },
    );

    return createdLog;
  });

  scheduleBreakGlassNotification({
    eventId,
    tier: 'TIER_1_SOFT_OVERRIDE',
    patientId: targetPatientId.toString(),
    physicianId: physicianMongoId.toString(),
    channel: resolvedChannel,
    notifyParties: ['PATIENT'],
  });

  return {
    breakGlassLog,
    sessionExpiresAt: new Date(
      eventCreatedAt.getTime() + BREAK_GLASS_TIER1_SESSION_HOURS * MS_PER_HOUR
    ),
    escalationDueBy,
  };
};

const initiateTier2Request = async ({
  physicianMongoId,
  targetPatientId,
  clinicalJustificationCode,
  freeTextReason,
  icdCodeContext,
  affectedDomains = CLINICAL_DOMAINS,
  notificationChannel,
}) => {
  const validationErrors = validateBreakGlassPayload({
    targetPatientId,
    clinicalJustificationCode,
    freeTextReason,
    affectedDomains,
    notificationChannel,
  });

  if (validationErrors.length > 0) {
    throw buildHttpError(validationErrors.join('; '), 400);
  }

  await Promise.all([assertPhysician(physicianMongoId), assertPatient(targetPatientId)]);

  const patient = await User.findById(targetPatientId).lean();
  const resolvedChannel = resolvePatientNotificationChannel(patient, notificationChannel);

  const eventCreatedAt = new Date();
  const escalatedToQueueAt = eventCreatedAt;
  const escalationDueBy = new Date(
    eventCreatedAt.getTime() + COMPLIANCE_ESCALATION_SLA_HOURS * MS_PER_HOUR
  );
  const eventId = buildEventId('breakglass-req');

  const signatureHash = sealAuditEvent(
    buildTier2RequestSealPayload({
      eventId,
      initiatedBy: physicianMongoId,
      targetPatientId,
      clinicalJustificationCode,
      freeTextReason,
      icdCodeContext,
      affectedDomains,
      eventCreatedAt,
    })
  );

  const breakGlassLog = await runBreakGlassInitiationTransaction(async (session) => {
    const [createdLog] = await BreakGlassAuditLog.create(
      [
        {
          eventId,
          tier: 'TIER_2_HARD_OVERRIDE',
          recordPhase: 'REQUEST',
          initiatedBy: physicianMongoId,
          targetPatientId,
          affectedDomains,
          justification: {
            clinicalJustificationCode,
            freeTextReason: freeTextReason.trim(),
            icdCodeContext,
          },
          patientNotification: {
            notificationSentAt: eventCreatedAt,
            notificationChannel: resolvedChannel,
            notificationDelivered: false,
          },
          complianceEscalation: {
            escalatedToQueueAt,
            escalationQueueId: buildEscalationQueueId(),
            reviewStatus: 'PENDING',
          },
          accessReport: {
            reportAvailableForPatientDispute: true,
          },
          signatureHash,
          eventCreatedAt,
        },
      ],
      { session },
    );

    await appendAuditLog(
      {
        eventType: 'BREAK_GLASS_INITIATED',
        actorId: physicianMongoId,
        targetResourceType: 'BreakGlassAuditLog',
        targetResourceId: eventId,
        payload: {
          tier: 'TIER_2_HARD_OVERRIDE',
          recordPhase: 'REQUEST',
          targetPatientId: targetPatientId.toString(),
          clinicalJustificationCode,
          escalationDueBy: escalationDueBy.toISOString(),
          notification: {
            patientId: targetPatientId.toString(),
            channel: resolvedChannel,
            notifyParties: ['PATIENT', 'CMO'],
          },
        },
      },
      { session },
    );

    return createdLog;
  });

  scheduleBreakGlassNotification({
    eventId,
    tier: 'TIER_2_HARD_OVERRIDE',
    recordPhase: 'REQUEST',
    patientId: targetPatientId.toString(),
    physicianId: physicianMongoId.toString(),
    channel: resolvedChannel,
    notifyParties: ['PATIENT', 'CMO'],
  });

  return {
    breakGlassLog,
    escalationDueBy,
    reviewStatus: 'PENDING',
  };
};

const listPendingComplianceQueue = async ({ asOf = new Date() } = {}) => {
  const pendingRequests = await BreakGlassAuditLog.find({
    tier: 'TIER_2_HARD_OVERRIDE',
    recordPhase: 'REQUEST',
    'complianceEscalation.reviewStatus': 'PENDING',
    eventCreatedAt: { $lte: asOf },
  })
    .sort({ 'complianceEscalation.escalatedToQueueAt': 1 })
    .lean()
    .exec();

  if (pendingRequests.length === 0) {
    return [];
  }

  const requestEventIds = pendingRequests.map((request) => request.eventId);
  const resolutions = await BreakGlassAuditLog.find({
    requestEventId: { $in: requestEventIds },
    recordPhase: { $in: ['APPROVAL', 'DENIAL'] },
  })
    .select('requestEventId')
    .lean()
    .exec();

  const resolvedIds = new Set(resolutions.map((resolution) => resolution.requestEventId));

  return pendingRequests.filter((request) => !resolvedIds.has(request.eventId));
};

const approveTier2Request = async ({
  requestEventId,
  cmoMongoId,
  retrospectiveReviewFlag = true,
  reviewOutcome = 'APPROVED_EMERGENCY_ACCESS',
}) => {
  await assertCmo(cmoMongoId);

  const request = await getTier2Request(requestEventId);
  const existingResolution = await getTier2Resolution(requestEventId);

  if (existingResolution) {
    throw buildHttpError('Tier 2 request has already been resolved', 409);
  }

  const authorizedAt = new Date();
  const eventCreatedAt = authorizedAt;
  const reviewDueBy = new Date(
    authorizedAt.getTime() + BREAK_GLASS_TIER2_RETROSPECTIVE_REVIEW_DAYS * MS_PER_DAY
  );
  const approvalEventId = buildEventId('breakglass-appr');

  const signatureHash = sealAuditEvent(
    buildTier2ApprovalSealPayload({
      eventId: approvalEventId,
      requestEventId,
      initiatedBy: request.initiatedBy,
      targetPatientId: request.targetPatientId,
      authorizedByCmoId: cmoMongoId,
      authorizedAt,
      clinicalJustificationCode: request.justification.clinicalJustificationCode,
      freeTextReason: request.justification.freeTextReason,
      eventCreatedAt,
    })
  );

  const approvalLog = await BreakGlassAuditLog.create({
    eventId: approvalEventId,
    tier: 'TIER_2_HARD_OVERRIDE',
    recordPhase: 'APPROVAL',
    requestEventId,
    initiatedBy: request.initiatedBy,
    targetPatientId: request.targetPatientId,
    affectedDomains: request.affectedDomains,
    justification: request.justification,
    tier2Authorization: {
      authorizedByCmoId: cmoMongoId,
      authorizedAt,
      retrospectiveReviewFlag,
      reviewDueBy,
    },
    complianceEscalation: {
      escalatedToQueueAt: request.complianceEscalation.escalatedToQueueAt,
      escalationQueueId: request.complianceEscalation.escalationQueueId,
      reviewStatus: 'CLEARED',
      reviewedBy: cmoMongoId,
      reviewedAt: authorizedAt,
      reviewOutcome,
    },
    accessReport: {
      reportAvailableForPatientDispute: true,
    },
    signatureHash,
    eventCreatedAt,
  });

  await appendAuditLog({
    eventType: 'BREAK_GLASS_APPROVED',
    actorId: cmoMongoId,
    targetResourceType: 'BreakGlassAuditLog',
    targetResourceId: requestEventId,
    payload: {
      tier: 'TIER_2_HARD_OVERRIDE',
      approvalEventId,
      initiatedBy: request.initiatedBy.toString(),
      targetPatientId: request.targetPatientId.toString(),
      sessionExpiresAt: new Date(
        authorizedAt.getTime() + BREAK_GLASS_TIER2_SESSION_HOURS * MS_PER_HOUR
      ).toISOString(),
      notification: {
        notifyParties: ['PHYSICIAN', 'PATIENT'],
        physicianId: request.initiatedBy.toString(),
        patientId: request.targetPatientId.toString(),
        channel: request.patientNotification.notificationChannel,
      },
    },
  });

  scheduleBreakGlassNotification({
    eventId: approvalEventId,
    requestEventId,
    tier: 'TIER_2_HARD_OVERRIDE',
    recordPhase: 'APPROVAL',
    patientId: request.targetPatientId.toString(),
    physicianId: request.initiatedBy.toString(),
    channel: request.patientNotification.notificationChannel,
    notifyParties: ['PHYSICIAN', 'PATIENT'],
  });

  return {
    request,
    approvalLog,
    sessionExpiresAt: new Date(
      authorizedAt.getTime() + BREAK_GLASS_TIER2_SESSION_HOURS * MS_PER_HOUR
    ),
    reviewStatus: 'CLEARED',
  };
};

const denyTier2Request = async ({
  requestEventId,
  cmoMongoId,
  reviewOutcome = 'DENIED_INSUFFICIENT_JUSTIFICATION',
}) => {
  await assertCmo(cmoMongoId);

  const request = await getTier2Request(requestEventId);
  const existingResolution = await getTier2Resolution(requestEventId);

  if (existingResolution) {
    throw buildHttpError('Tier 2 request has already been resolved', 409);
  }

  const reviewedAt = new Date();
  const denialEventId = buildEventId('breakglass-deny');

  const signatureHash = sealAuditEvent(
    buildTier2DenialSealPayload({
      eventId: denialEventId,
      requestEventId,
      initiatedBy: request.initiatedBy,
      targetPatientId: request.targetPatientId,
      reviewedBy: cmoMongoId,
      reviewedAt,
      reviewOutcome,
      eventCreatedAt: reviewedAt,
    }),
  );

  const denialLog = await BreakGlassAuditLog.create({
    eventId: denialEventId,
    tier: 'TIER_2_HARD_OVERRIDE',
    recordPhase: 'DENIAL',
    requestEventId,
    initiatedBy: request.initiatedBy,
    targetPatientId: request.targetPatientId,
    affectedDomains: request.affectedDomains,
    justification: request.justification,
    complianceEscalation: {
      escalatedToQueueAt: request.complianceEscalation.escalatedToQueueAt,
      escalationQueueId: request.complianceEscalation.escalationQueueId,
      reviewStatus: 'FLAGGED_FOR_INVESTIGATION',
      reviewedBy: cmoMongoId,
      reviewedAt,
      reviewOutcome,
    },
    accessReport: {
      reportAvailableForPatientDispute: true,
    },
    signatureHash,
    eventCreatedAt: reviewedAt,
  });

  await appendAuditLog({
    eventType: 'BREAK_GLASS_DENIED',
    actorId: cmoMongoId,
    targetResourceType: 'BreakGlassAuditLog',
    targetResourceId: requestEventId,
    payload: {
      tier: 'TIER_2_HARD_OVERRIDE',
      recordPhase: 'DENIAL',
      denialEventId,
      reviewStatus: 'FLAGGED_FOR_INVESTIGATION',
      reviewOutcome,
      notification: {
        notifyParties: ['PHYSICIAN'],
        physicianId: request.initiatedBy.toString(),
        channel: request.patientNotification.notificationChannel,
      },
    },
  });

  scheduleBreakGlassNotification({
    eventId: denialEventId,
    requestEventId,
    tier: 'TIER_2_HARD_OVERRIDE',
    recordPhase: 'DENIAL',
    physicianId: request.initiatedBy.toString(),
    patientId: request.targetPatientId.toString(),
    channel: request.patientNotification.notificationChannel,
    notifyParties: ['PHYSICIAN'],
  });

  return {
    request,
    denialLog,
    reviewStatus: 'FLAGGED_FOR_INVESTIGATION',
  };
};

const getTier2RequestStatus = async (requestEventId) => {
  const request = await getTier2Request(requestEventId);
  const resolution = await getTier2Resolution(requestEventId);

  return {
    request,
    resolution,
    reviewStatus: resolution
      ? resolution.complianceEscalation.reviewStatus
      : request.complianceEscalation.reviewStatus,
    sessionExpiresAt:
      resolution?.recordPhase === 'APPROVAL'
        ? new Date(
            resolution.tier2Authorization.authorizedAt.getTime() +
              BREAK_GLASS_TIER2_SESSION_HOURS * MS_PER_HOUR
          )
        : null,
  };
};

const PATIENT_ALERT_LOOKBACK_DAYS = 7;

const listPatientBreakGlassAlerts = async ({
  patientId,
  asOf = new Date(),
  lookbackDays = PATIENT_ALERT_LOOKBACK_DAYS,
} = {}) => {
  if (!patientId || !isValidObjectId(patientId)) {
    throw buildHttpError('patientId must be a valid ObjectId', 400);
  }

  const patientObjectId = toObjectId(patientId);
  const since = new Date(asOf.getTime() - lookbackDays * MS_PER_DAY);

  const events = await BreakGlassAuditLog.find({
    targetPatientId: patientObjectId,
    eventCreatedAt: { $gte: since, $lte: asOf },
    $or: [
      { tier: 'TIER_1_SOFT_OVERRIDE' },
      {
        tier: 'TIER_2_HARD_OVERRIDE',
        recordPhase: { $in: ['REQUEST', 'APPROVAL'] },
      },
    ],
  })
    .sort({ eventCreatedAt: -1 })
    .lean()
    .exec();

  return events.map((event) => ({
    eventId: event.eventId,
    tier: event.tier,
    recordPhase: event.recordPhase || null,
    eventCreatedAt: event.eventCreatedAt,
    reviewStatus: event.complianceEscalation?.reviewStatus || null,
    clinicalJustificationCode: event.justification?.clinicalJustificationCode || null,
    message:
      event.tier === 'TIER_1_SOFT_OVERRIDE'
        ? 'A physician accessed your records under emergency break-glass authorization.'
        : event.recordPhase === 'APPROVAL'
          ? 'Emergency access to your records was approved by your organization.'
          : 'A physician requested emergency access to your records; CMO review is pending.',
  }));
};

module.exports = {
  MIN_FREE_TEXT_REASON_LENGTH,
  IncompleteJustificationError,
  buildEventId,
  executeBreakGlassOverride,
  resolveTierForDomains,
  runBreakGlassInitiationTransaction,
  initiateTier1SoftOverride,
  initiateTier2Request,
  listPendingComplianceQueue,
  listPatientBreakGlassAlerts,
  approveTier2Request,
  denyTier2Request,
  getTier2RequestStatus,
};
