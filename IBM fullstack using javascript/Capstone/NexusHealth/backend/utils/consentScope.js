// backend/utils/consentScope.js
const { toObjectId } = require('./objectId');

// Explicit read-capable tiers. Add new tiers here deliberately — do not alias PERMISSION_TIERS blindly.
const READ_PERMISSION_TIERS = [
  'VIEW_ONLY',
  'VIEW_ADD_NOTES',
  'VIEW_ADD_PRESCRIPTIONS',
  'FULL_WRITE',
];

const getEffectiveAllowedDomains = (consent) => {
  const allowed = consent.allowedDomains ?? [];
  const excluded = new Set(consent.excludedDomains ?? []);
  return allowed.filter((domain) => !excluded.has(domain));
};

const buildConsentScopedMatch = (consent, patientId) => {
  const effectiveDomains = getEffectiveAllowedDomains(consent);

  if (effectiveDomains.length === 0) {
    const error = new Error('Consent scope has no effective allowed domains');
    error.statusCode = 500;
    throw error;
  }

  const match = {
    patientId: toObjectId(patientId),
    domain: { $in: effectiveDomains },
  };

  if (consent.episodeId) {
    match.episodeId = consent.episodeId;
  }

  return match;
};

const isRecordWithinConsentScope = (record, consent) => {
  const effectiveDomains = getEffectiveAllowedDomains(consent);

  if (!effectiveDomains.includes(record.domain)) {
    return false;
  }

  if (consent.episodeId && record.episodeId !== consent.episodeId) {
    return false;
  }

  return true;
};

const isConsentReadable = (consent, asOf = new Date()) =>
  consent?.status === 'ACTIVE' &&
  consent.grantedAt instanceof Date &&
  consent.grantedAt <= asOf &&
  consent.expiresAt instanceof Date &&
  consent.expiresAt > asOf &&
  consent.patientConfirmation?.confirmedAt instanceof Date &&
  READ_PERMISSION_TIERS.includes(consent.permissionTier);

const buildConsentScopedPipeline = (consent, patientId, extraStages = []) => [
  { $match: buildConsentScopedMatch(consent, patientId) },
  ...extraStages,
];

module.exports = {
  READ_PERMISSION_TIERS,
  getEffectiveAllowedDomains,
  buildConsentScopedMatch,
  buildConsentScopedPipeline,
  isRecordWithinConsentScope,
  isConsentReadable,
};
