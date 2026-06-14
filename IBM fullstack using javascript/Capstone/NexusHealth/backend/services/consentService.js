// backend/services/consentService.js
const crypto = require('crypto');
const { ConsentRule, AuditLog, User } = require('../models');
const { MAX_CONSENT_WINDOW_DAYS, CONFIRMATION_METHODS } = require('../config/enums');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const buildConsentId = () => `consent-${crypto.randomUUID()}`;
const buildAuditId = () => `audit-${crypto.randomUUID()}`;

const hashConfirmingIdentity = (userId, confirmedAt) =>
  crypto.createHash('sha256').update(`${userId}:${confirmedAt.toISOString()}`).digest('hex');

const appendAuditLog = async ({ eventType, actorId, targetResourceId, payload }) => {
  await AuditLog.create({
    auditId: buildAuditId(),
    eventType,
    actorId,
    targetResourceType: 'ConsentRule',
    targetResourceId,
    payload,
    eventCreatedAt: new Date(),
  });
};

const validateCreatePayload = ({
  providerId,
  permissionTier,
  allowedDomains,
  excludedDomains = [],
  episodeId,
  durationDays = MAX_CONSENT_WINDOW_DAYS,
}) => {
  const errors = [];

  if (!providerId) errors.push('providerId is required');
  if (!permissionTier) errors.push('permissionTier is required');
  if (!Array.isArray(allowedDomains) || allowedDomains.length === 0) {
    errors.push('allowedDomains must contain at least one domain');
  }
  if (!episodeId) errors.push('episodeId is required');
  if (durationDays < 1 || durationDays > MAX_CONSENT_WINDOW_DAYS) {
    errors.push(`durationDays must be between 1 and ${MAX_CONSENT_WINDOW_DAYS}`);
  }

  const excluded = new Set(excludedDomains);
  if (allowedDomains?.some((domain) => excluded.has(domain))) {
    errors.push('allowedDomains and excludedDomains cannot overlap');
  }

  return errors;
};

const createConsentDraft = async ({
  patientMongoId,
  providerId,
  permissionTier,
  allowedDomains,
  excludedDomains = [],
  episodeId,
  durationDays = MAX_CONSENT_WINDOW_DAYS,
  consentOrigin = 'PATIENT_PORTAL',
}) => {
  const validationErrors = validateCreatePayload({
    providerId,
    permissionTier,
    allowedDomains,
    excludedDomains,
    episodeId,
    durationDays,
  });

  if (validationErrors.length > 0) {
    const error = new Error(validationErrors.join('; '));
    error.statusCode = 400;
    throw error;
  }

  const provider = await User.findById(providerId).lean();
  if (!provider || !['PHYSICIAN', 'CMO'].includes(provider.role)) {
    const error = new Error('providerId must reference an active physician or CMO');
    error.statusCode = 400;
    throw error;
  }

  const consentId = buildConsentId();
  const consent = await ConsentRule.create({
    consentId,
    versionNumber: 1,
    patientId: patientMongoId,
    providerId,
    episodeId,
    permissionTier,
    allowedDomains,
    excludedDomains,
    status: 'PENDING_PATIENT_CONFIRMATION',
    consentOrigin,
    proposedDurationDays: durationDays,
    stateChangeLog: [
      {
        fromStatus: 'NONE',
        toStatus: 'PENDING_PATIENT_CONFIRMATION',
        changedAt: new Date(),
        changedBy: patientMongoId,
        reason: 'Consent draft created',
      },
    ],
  });

  await appendAuditLog({
    eventType: 'CONSENT_CREATED',
    actorId: patientMongoId,
    targetResourceId: consentId,
    payload: {
      providerId: providerId.toString(),
      permissionTier,
      allowedDomains,
      excludedDomains,
      episodeId,
      durationDays,
    },
  });

  return consent;
};

const confirmConsent = async ({
  consentId,
  patientMongoId,
  confirmedViaMethod,
  durationDays,
}) => {
  if (!CONFIRMATION_METHODS.includes(confirmedViaMethod)) {
    const error = new Error('confirmedViaMethod is invalid');
    error.statusCode = 400;
    throw error;
  }

  const consent = await ConsentRule.findOne({
    consentId,
    status: 'PENDING_PATIENT_CONFIRMATION',
  })
    .sort({ versionNumber: -1 })
    .exec();

  if (!consent) {
    const error = new Error('Pending consent not found');
    error.statusCode = 404;
    throw error;
  }

  if (consent.patientId.toString() !== patientMongoId.toString()) {
    const error = new Error('Only the consenting patient may confirm this consent');
    error.statusCode = 403;
    throw error;
  }

  const effectiveDurationDays =
    durationDays ?? consent.proposedDurationDays ?? MAX_CONSENT_WINDOW_DAYS;

  if (effectiveDurationDays < 1 || effectiveDurationDays > MAX_CONSENT_WINDOW_DAYS) {
    const error = new Error(`durationDays must be between 1 and ${MAX_CONSENT_WINDOW_DAYS}`);
    error.statusCode = 400;
    throw error;
  }

  const grantedAt = new Date();
  const expiresAt = new Date(grantedAt.getTime() + effectiveDurationDays * MS_PER_DAY);
  const confirmingIdentityHash = hashConfirmingIdentity(patientMongoId.toString(), grantedAt);

  consent.status = 'ACTIVE';
  consent.grantedAt = grantedAt;
  consent.expiresAt = expiresAt;
  consent.renewalRequested = false;
  consent.renewalRequestedAt = undefined;
  consent.patientConfirmation = {
    confirmedAt: grantedAt,
    confirmedViaMethod,
    confirmingIdentityHash,
  };
  consent.stateChangeLog.push({
    fromStatus: 'PENDING_PATIENT_CONFIRMATION',
    toStatus: 'ACTIVE',
    changedAt: grantedAt,
    changedBy: patientMongoId,
    reason:
      consent.versionNumber > 1
        ? 'Patient actively re-confirmed renewed consent'
        : 'Patient actively confirmed consent',
  });

  await consent.save();

  if (consent.previousVersionId) {
    const previousVersion = await ConsentRule.findById(consent.previousVersionId);
    if (previousVersion && ['ACTIVE', 'EXPIRED'].includes(previousVersion.status)) {
      const supersededAt = new Date();
      const previousStatus = previousVersion.status;

      previousVersion.status = 'SUPERSEDED';
      previousVersion.stateChangeLog.push({
        fromStatus: previousStatus,
        toStatus: 'SUPERSEDED',
        changedAt: supersededAt,
        changedBy: patientMongoId,
        reason: `Superseded by consent version ${consent.versionNumber}`,
      });
      await previousVersion.save();
    }
  }

  const auditEventType = consent.versionNumber > 1 ? 'CONSENT_RENEWED' : 'CONSENT_CONFIRMED';

  await appendAuditLog({
    eventType: auditEventType,
    actorId: patientMongoId,
    targetResourceId: consentId,
    payload: {
      versionNumber: consent.versionNumber,
      grantedAt: grantedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      confirmedViaMethod,
      confirmingIdentityHash,
    },
  });

  return consent;
};

const findActiveConsent = async (consentId) =>
  ConsentRule.findOne({ consentId, status: 'ACTIVE' }).sort({ versionNumber: -1 }).exec();

const findRenewableConsent = async (consentId) =>
  ConsentRule.findOne({ consentId, status: { $in: ['ACTIVE', 'EXPIRED'] } })
    .sort({ versionNumber: -1 })
    .exec();

const revokeConsent = async ({ consentId, patientMongoId, revokedReason }) => {
  if (!revokedReason || revokedReason.trim().length === 0) {
    const error = new Error('revokedReason is required');
    error.statusCode = 400;
    throw error;
  }

  const consent = await findActiveConsent(consentId);

  if (!consent) {
    const error = new Error('Active consent not found');
    error.statusCode = 404;
    throw error;
  }

  if (consent.patientId.toString() !== patientMongoId.toString()) {
    const error = new Error('Only the consenting patient may revoke this consent');
    error.statusCode = 403;
    throw error;
  }

  const revokedAt = new Date();
  const previousStatus = consent.status;

  consent.status = 'REVOKED';
  consent.revokedAt = revokedAt;
  consent.revokedReason = revokedReason.trim();
  consent.stateChangeLog.push({
    fromStatus: previousStatus,
    toStatus: 'REVOKED',
    changedAt: revokedAt,
    changedBy: patientMongoId,
    reason: revokedReason.trim(),
  });

  await consent.save();

  await appendAuditLog({
    eventType: 'CONSENT_REVOKED',
    actorId: patientMongoId,
    targetResourceId: consentId,
    payload: {
      versionNumber: consent.versionNumber,
      revokedAt: revokedAt.toISOString(),
      revokedReason: revokedReason.trim(),
    },
  });

  return consent;
};

const requestRenewal = async ({ consentId, patientMongoId, durationDays }) => {
  const existingConsent = await findRenewableConsent(consentId);

  if (!existingConsent) {
    const error = new Error('No renewable consent found');
    error.statusCode = 404;
    throw error;
  }

  if (existingConsent.patientId.toString() !== patientMongoId.toString()) {
    const error = new Error('Only the consenting patient may request renewal');
    error.statusCode = 403;
    throw error;
  }

  const pendingRenewal = await ConsentRule.findOne({
    consentId,
    status: 'PENDING_PATIENT_CONFIRMATION',
  })
    .sort({ versionNumber: -1 })
    .exec();

  if (pendingRenewal) {
    const error = new Error('A renewal is already pending patient confirmation');
    error.statusCode = 409;
    throw error;
  }

  const effectiveDurationDays =
    durationDays ?? existingConsent.proposedDurationDays ?? MAX_CONSENT_WINDOW_DAYS;

  if (effectiveDurationDays < 1 || effectiveDurationDays > MAX_CONSENT_WINDOW_DAYS) {
    const error = new Error(`durationDays must be between 1 and ${MAX_CONSENT_WINDOW_DAYS}`);
    error.statusCode = 400;
    throw error;
  }

  const renewalRequestedAt = new Date();
  const nextVersionNumber = existingConsent.versionNumber + 1;

  existingConsent.renewalRequested = true;
  existingConsent.renewalRequestedAt = renewalRequestedAt;
  existingConsent.stateChangeLog.push({
    fromStatus: existingConsent.status,
    toStatus: existingConsent.status,
    changedAt: renewalRequestedAt,
    changedBy: patientMongoId,
    reason: 'Renewal requested; awaiting patient re-confirmation',
  });
  await existingConsent.save();

  const renewalDraft = await ConsentRule.create({
    consentId,
    versionNumber: nextVersionNumber,
    previousVersionId: existingConsent._id,
    patientId: existingConsent.patientId,
    providerId: existingConsent.providerId,
    episodeId: existingConsent.episodeId,
    permissionTier: existingConsent.permissionTier,
    allowedDomains: existingConsent.allowedDomains,
    excludedDomains: existingConsent.excludedDomains,
    status: 'PENDING_PATIENT_CONFIRMATION',
    consentOrigin: existingConsent.consentOrigin,
    proposedDurationDays: effectiveDurationDays,
    stateChangeLog: [
      {
        fromStatus: existingConsent.status,
        toStatus: 'PENDING_PATIENT_CONFIRMATION',
        changedAt: renewalRequestedAt,
        changedBy: patientMongoId,
        reason: 'Renewal draft created; requires active patient re-confirmation',
      },
    ],
  });

  await appendAuditLog({
    eventType: 'CONSENT_RENEWED',
    actorId: patientMongoId,
    targetResourceId: consentId,
    payload: {
      action: 'RENEWAL_REQUESTED',
      versionNumber: nextVersionNumber,
      previousVersionNumber: existingConsent.versionNumber,
      proposedDurationDays: effectiveDurationDays,
    },
  });

  return renewalDraft;
};

const buildExpiryNotificationPayload = (consent) => ({
  consentId: consent.consentId,
  versionNumber: consent.versionNumber,
  patientId: consent.patientId.toString(),
  providerId: consent.providerId.toString(),
  expiredAt: consent.expiresAt.toISOString(),
  notifyParties: ['PATIENT', 'PROVIDER'],
});

const expireConsents = async ({ asOf = new Date() } = {}) => {
  const expiringConsents = await ConsentRule.find({
    status: 'ACTIVE',
    expiresAt: { $lte: asOf },
  }).exec();

  const results = [];

  for (const consent of expiringConsents) {
    const expiredAt = new Date();
    const previousStatus = consent.status;

    consent.status = 'EXPIRED';
    consent.stateChangeLog.push({
      fromStatus: previousStatus,
      toStatus: 'EXPIRED',
      changedAt: expiredAt,
      changedBy: consent.patientId,
      reason: 'Consent window elapsed',
    });

    await consent.save();

    const notificationPayload = buildExpiryNotificationPayload(consent);

    await appendAuditLog({
      eventType: 'CONSENT_EXPIRED',
      actorId: consent.patientId,
      targetResourceId: consent.consentId,
      payload: {
        versionNumber: consent.versionNumber,
        expiredAt: expiredAt.toISOString(),
        notification: notificationPayload,
      },
    });

    results.push({ consent, notification: notificationPayload });
  }

  return results;
};

const listConsentsForPatient = async (patientMongoId) =>
  ConsentRule.find({ patientId: patientMongoId }).sort({ updatedAt: -1 }).lean();

const listConsentsForProvider = async (providerMongoId) =>
  ConsentRule.find({ providerId: providerMongoId }).sort({ updatedAt: -1 }).lean();

const formatPatientSummary = (user) => {
  if (!user) return null;
  const first = user.demographics?.legalName?.first || '';
  const last = user.demographics?.legalName?.last || '';
  return {
    id: user._id.toString(),
    mrn: user.patientProfile?.mrn || '',
    displayName: [first, last].filter(Boolean).join(' '),
  };
};

const listProviderConsentReports = async (providerMongoId, { mrn } = {}) => {
  let patientIdsFilter = null;

  if (mrn?.trim()) {
    const escaped = mrn.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const matchingPatients = await User.find({
      role: 'PATIENT',
      'patientProfile.mrn': regex,
    })
      .select('_id')
      .lean();

    patientIdsFilter = matchingPatients.map((patient) => patient._id);
    if (patientIdsFilter.length === 0) {
      return [];
    }
  }

  const query = { providerId: providerMongoId };
  if (patientIdsFilter) {
    query.patientId = { $in: patientIdsFilter };
  }

  const consents = await ConsentRule.find(query).sort({ updatedAt: -1 }).lean();
  if (consents.length === 0) return [];

  const patientIds = [...new Set(consents.map((consent) => consent.patientId.toString()))];
  const patients = await User.find({ _id: { $in: patientIds } }).lean();
  const patientById = Object.fromEntries(patients.map((patient) => [patient._id.toString(), patient]));

  return consents.map((consent) => ({
    consentId: consent.consentId,
    versionNumber: consent.versionNumber,
    status: consent.status,
    permissionTier: consent.permissionTier,
    allowedDomains: consent.allowedDomains,
    excludedDomains: consent.excludedDomains,
    grantedAt: consent.grantedAt,
    expiresAt: consent.expiresAt,
    revokedAt: consent.revokedAt,
    patient: formatPatientSummary(patientById[consent.patientId.toString()]),
  }));
};

module.exports = {
  buildConsentId,
  hashConfirmingIdentity,
  createConsentDraft,
  confirmConsent,
  revokeConsent,
  requestRenewal,
  expireConsents,
  listConsentsForPatient,
  listProviderConsentReports,
};
