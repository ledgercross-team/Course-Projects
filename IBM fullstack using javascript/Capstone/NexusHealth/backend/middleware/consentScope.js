// backend/middleware/consentScope.js
const { getActiveConsentForProvider } = require('../services/consentScopeService');
const { getActiveTier1Override, getActiveTier2Override } = require('../services/breakGlassScopeService');
const { buildConsentScopedMatch } = require('../utils/consentScope');
const { isValidObjectId } = require('../utils/objectId');

const resolveClinicalReadScope = async (req, res, next) => {
  const { patientId } = req.params;

  if (!patientId || !isValidObjectId(patientId)) {
    return res.status(400).json({ error: 'A valid patientId is required' });
  }

  const { authUser } = req;

  if (authUser.role === 'PATIENT') {
    if (authUser._id.toString() !== patientId) {
      return res.status(403).json({ error: 'Patients may only access their own clinical records' });
    }

    req.clinicalReadScope = {
      type: 'SELF',
      unrestricted: true,
      patientId,
    };
    return next();
  }

  if (['PHYSICIAN', 'CMO'].includes(authUser.role)) {
    const activeTier1Override = await getActiveTier1Override({
      patientId,
      providerId: authUser._id,
    });

    if (activeTier1Override) {
      req.clinicalReadScope = {
        type: 'BREAK_GLASS_TIER1',
        unrestricted: true,
        patientId,
        breakGlassEventId: activeTier1Override.eventId,
      };
      return next();
    }

    const activeTier2Override = await getActiveTier2Override({
      patientId,
      providerId: authUser._id,
    });

    if (activeTier2Override) {
      req.clinicalReadScope = {
        type: 'BREAK_GLASS_TIER2',
        unrestricted: true,
        patientId,
        breakGlassEventId: activeTier2Override.eventId,
        requestEventId: activeTier2Override.requestEventId,
      };
      return next();
    }

    const consent = await getActiveConsentForProvider({
      patientId,
      providerId: authUser._id,
    });

    if (!consent) {
      return res.status(403).json({
        error: 'No active, unexpired consent authorizes access to this patient',
      });
    }

    req.clinicalReadScope = {
      type: 'CONSENT',
      unrestricted: false,
      patientId,
      consent,
      matchFilter: buildConsentScopedMatch(consent, patientId),
    };
    return next();
  }

  return res.status(403).json({ error: 'Role is not authorized to read clinical records' });
};

module.exports = { resolveClinicalReadScope };
