// backend/services/consentScopeService.js
const { ConsentRule } = require('../models');
const { isConsentReadable } = require('../utils/consentScope');

const getActiveConsentForProvider = async ({ patientId, providerId, asOf = new Date() }) => {
  const consent = await ConsentRule.findOne({
    patientId,
    providerId,
    status: 'ACTIVE',
    expiresAt: { $gt: asOf },
    grantedAt: { $lte: asOf },
    'patientConfirmation.confirmedAt': { $exists: true, $ne: null },
  })
    .sort({ versionNumber: -1 })
    .exec();

  if (!consent || !isConsentReadable(consent, asOf)) {
    return null;
  }

  return consent;
};

module.exports = {
  getActiveConsentForProvider,
};
