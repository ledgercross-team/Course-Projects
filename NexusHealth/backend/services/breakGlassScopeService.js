// backend/services/breakGlassScopeService.js
const { BreakGlassAuditLog } = require('../models');
const {
  BREAK_GLASS_TIER1_SESSION_HOURS,
  BREAK_GLASS_TIER2_SESSION_HOURS,
} = require('../config/enums');

const MS_PER_HOUR = 60 * 60 * 1000;

const getActiveTier1Override = async ({ patientId, providerId, asOf = new Date() }) => {
  const sessionStartedAfter = new Date(
    asOf.getTime() - BREAK_GLASS_TIER1_SESSION_HOURS * MS_PER_HOUR
  );

  const override = await BreakGlassAuditLog.findOne({
    tier: 'TIER_1_SOFT_OVERRIDE',
    initiatedBy: providerId,
    targetPatientId: patientId,
    eventCreatedAt: { $gte: sessionStartedAfter, $lte: asOf },
    'complianceEscalation.reviewStatus': { $ne: 'FLAGGED_FOR_INVESTIGATION' },
  })
    .sort({ eventCreatedAt: -1 })
    .exec();

  return override;
};

const getActiveTier2Override = async ({ patientId, providerId, asOf = new Date() }) => {
  const sessionStartedAfter = new Date(
    asOf.getTime() - BREAK_GLASS_TIER2_SESSION_HOURS * MS_PER_HOUR
  );

  const approval = await BreakGlassAuditLog.findOne({
    tier: 'TIER_2_HARD_OVERRIDE',
    recordPhase: 'APPROVAL',
    initiatedBy: providerId,
    targetPatientId: patientId,
    'tier2Authorization.authorizedAt': { $gte: sessionStartedAfter, $lte: asOf },
    'complianceEscalation.reviewStatus': 'CLEARED',
  })
    .sort({ 'tier2Authorization.authorizedAt': -1 })
    .exec();

  return approval;
};

module.exports = {
  getActiveTier1Override,
  getActiveTier2Override,
};
