// backend/utils/providerClinicalAccess.js
const { getActiveConsentForProvider } = require('../services/consentScopeService');
const {
  getActiveTier1Override,
  getActiveTier2Override,
} = require('../services/breakGlassScopeService');
const { isValidObjectId, toObjectId } = require('./objectId');

const assertProviderClinicalAccess = async (authUser, patientId) => {
  if (!patientId || !isValidObjectId(patientId)) {
    const error = new Error('A valid patientId is required');
    error.statusCode = 400;
    throw error;
  }

  if (!authUser) {
    const error = new Error('Authentication required');
    error.statusCode = 401;
    throw error;
  }

  if (authUser.role === 'PATIENT') {
    const error = new Error('Patients may not access clinical prescribing operations for others');
    error.statusCode = 403;
    throw error;
  }

  if (!['PHYSICIAN', 'CMO'].includes(authUser.role)) {
    const error = new Error('Role is not authorized to access patient clinical data');
    error.statusCode = 403;
    throw error;
  }

  const patientObjectId = toObjectId(patientId);

  const activeTier1Override = await getActiveTier1Override({
    patientId: patientObjectId,
    providerId: authUser._id,
  });

  if (activeTier1Override) {
    return { type: 'BREAK_GLASS_TIER1', patientId: patientObjectId };
  }

  const activeTier2Override = await getActiveTier2Override({
    patientId: patientObjectId,
    providerId: authUser._id,
  });

  if (activeTier2Override) {
    return { type: 'BREAK_GLASS_TIER2', patientId: patientObjectId };
  }

  const consent = await getActiveConsentForProvider({
    patientId: patientObjectId,
    providerId: authUser._id,
  });

  if (!consent) {
    const error = new Error('No active, unexpired consent authorizes access to this patient');
    error.statusCode = 403;
    throw error;
  }

  return { type: 'CONSENT', patientId: patientObjectId, consent };
};

module.exports = {
  assertProviderClinicalAccess,
};
