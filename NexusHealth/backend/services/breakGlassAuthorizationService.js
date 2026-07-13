// backend/services/breakGlassAuthorizationService.js
const { User, ClinicalRecord, ConsentRule } = require('../models');
const { CLINICAL_DOMAINS } = require('../config/enums');
const {
  getEffectiveAllowedDomains,
  isConsentReadable,
} = require('../utils/consentScope');
const {
  getActiveTier1Override,
  getActiveTier2Override,
} = require('./breakGlassScopeService');
const { isValidObjectId, toObjectId } = require('../utils/objectId');

const SENSITIVITY_RANK = {
  STANDARD: 0,
  SENSITIVE: 1,
  HIGHLY_SENSITIVE: 2,
};

class AuthorizationError extends Error {
  constructor(message, statusCode = 400, code = 'AUTHORIZATION_ERROR') {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

class UnauthorizedOverrideAttempt extends AuthorizationError {
  constructor(message = 'Provider is not authorized for this access check') {
    super(message, 403, 'UNAUTHORIZED_OVERRIDE_ATTEMPT');
    this.name = 'UnauthorizedOverrideAttempt';
  }
}

const assertValidDomain = (domain) => {
  if (!domain || !CLINICAL_DOMAINS.includes(domain)) {
    throw new AuthorizationError('domain must be a valid clinical domain', 400, 'INVALID_DOMAIN');
  }
};

const resolveRequiredTier = (sensitivityClassification) =>
  sensitivityClassification === 'HIGHLY_SENSITIVE'
    ? 'TIER_2_HARD_OVERRIDE'
    : 'TIER_1_SOFT_OVERRIDE';

const getDomainSensitivity = async (patientObjectId, domain, ClinicalRecordModel = ClinicalRecord) => {
  const records = await ClinicalRecordModel.find({
    patientId: patientObjectId,
    domain,
  })
    .select('sensitivityClassification')
    .lean();

  if (records.length === 0) {
    return 'STANDARD';
  }

  return records.reduce((highest, record) => {
    const current = record.sensitivityClassification || 'STANDARD';
    return SENSITIVITY_RANK[current] > SENSITIVITY_RANK[highest] ? current : highest;
  }, 'STANDARD');
};

const findReadableConsent = async (
  { patientObjectId, providerObjectId, asOf },
  ConsentRuleModel = ConsentRule,
) => {
  const consent = await ConsentRuleModel.findOne({
    patientId: patientObjectId,
    providerId: providerObjectId,
    status: 'ACTIVE',
    expiresAt: { $gt: asOf },
    grantedAt: { $lte: asOf },
    'patientConfirmation.confirmedAt': { $exists: true, $ne: null },
  })
    .sort({ versionNumber: -1 })
    .lean();

  if (!consent || !isConsentReadable(consent, asOf)) {
    return null;
  }

  return consent;
};

const isDomainAllowedByConsent = (consent, domain) => {
  const effectiveDomains = getEffectiveAllowedDomains(consent);
  return effectiveDomains.includes(domain);
};

const createBreakGlassAuthorizationService = ({
  UserModel = User,
  ClinicalRecordModel = ClinicalRecord,
  ConsentRuleModel = ConsentRule,
  getActiveTier1OverrideImpl = getActiveTier1Override,
  getActiveTier2OverrideImpl = getActiveTier2Override,
} = {}) => {
  const checkAccessPermission = async (
    providerId,
    patientId,
    domain,
    { asOf = new Date() } = {},
  ) => {
    if (!providerId || !isValidObjectId(providerId)) {
      throw new AuthorizationError('providerId must be a valid ObjectId', 400, 'INVALID_PROVIDER_ID');
    }

    if (!patientId || !isValidObjectId(patientId)) {
      throw new AuthorizationError('patientId must be a valid ObjectId', 400, 'INVALID_PATIENT_ID');
    }

    assertValidDomain(domain);

    const providerObjectId = toObjectId(providerId);
    const patientObjectId = toObjectId(patientId);

    const [provider, patient, domainSensitivity] = await Promise.all([
      UserModel.findById(providerObjectId).lean(),
      UserModel.findById(patientObjectId).lean(),
      getDomainSensitivity(patientObjectId, domain, ClinicalRecordModel),
    ]);

    if (!provider) {
      throw new AuthorizationError('Provider not found', 404, 'PROVIDER_NOT_FOUND');
    }

    if (!patient) {
      throw new AuthorizationError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    if (!['PHYSICIAN', 'CMO'].includes(provider.role)) {
      throw new UnauthorizedOverrideAttempt('Only physicians and CMOs may evaluate clinical access');
    }

    if (patient.role !== 'PATIENT') {
      throw new AuthorizationError('patientId must reference a patient account', 400, 'INVALID_PATIENT_ROLE');
    }

    const requiredTier = resolveRequiredTier(domainSensitivity);
    const breakGlassEligible = provider.role === 'PHYSICIAN';

    const activeTier1 = await getActiveTier1OverrideImpl({
      patientId: patientObjectId,
      providerId: providerObjectId,
      asOf,
    });

    if (activeTier1) {
      return {
        allowed: true,
        source: 'BREAK_GLASS_TIER1',
        consent: null,
        breakGlassEventId: activeTier1.eventId,
        breakGlassEligible,
        requiredTier,
        domainSensitivity,
        reason: null,
      };
    }

    const activeTier2 = await getActiveTier2OverrideImpl({
      patientId: patientObjectId,
      providerId: providerObjectId,
      asOf,
    });

    if (activeTier2) {
      return {
        allowed: true,
        source: 'BREAK_GLASS_TIER2',
        consent: null,
        breakGlassEventId: activeTier2.eventId,
        breakGlassEligible,
        requiredTier,
        domainSensitivity,
        reason: null,
      };
    }

    const consent = await findReadableConsent(
      { patientObjectId, providerObjectId, asOf },
      ConsentRuleModel,
    );

    if (consent && isDomainAllowedByConsent(consent, domain)) {
      return {
        allowed: true,
        source: 'CONSENT',
        consent,
        breakGlassEventId: null,
        breakGlassEligible,
        requiredTier,
        domainSensitivity,
        reason: null,
      };
    }

    const reason = !consent
      ? 'No active, patient-confirmed consent authorizes access to this patient'
      : `Consent does not permit access to the ${domain} domain`;

    return {
      allowed: false,
      source: null,
      consent,
      breakGlassEventId: null,
      breakGlassEligible,
      requiredTier: breakGlassEligible ? requiredTier : null,
      domainSensitivity,
      reason,
    };
  };

  return {
    checkAccessPermission,
    getDomainSensitivity,
    resolveRequiredTier,
    findReadableConsent,
    isDomainAllowedByConsent,
  };
};

const defaultService = createBreakGlassAuthorizationService();

module.exports = {
  AuthorizationError,
  UnauthorizedOverrideAttempt,
  SENSITIVITY_RANK,
  createBreakGlassAuthorizationService,
  checkAccessPermission: (...args) => defaultService.checkAccessPermission(...args),
  getDomainSensitivity: (...args) => defaultService.getDomainSensitivity(...args),
  resolveRequiredTier,
  findReadableConsent: (...args) => defaultService.findReadableConsent(...args),
  isDomainAllowedByConsent,
};
