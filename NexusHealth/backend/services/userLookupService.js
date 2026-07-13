// backend/services/userLookupService.js
const { User } = require('../models');

const formatProviderResult = (user) => ({
  id: user._id.toString(),
  userId: user.userId,
  displayName: `Dr. ${user.demographics?.legalName?.first || ''} ${user.demographics?.legalName?.last || ''}`.trim(),
  npiNumber: user.physicianProfile?.npiNumber,
  specializations: user.physicianProfile?.specializations || [],
  role: user.role,
});

const searchProviders = async (query, { limit = 10 } = {}) => {
  const trimmed = query?.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const regex = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

  const providers = await User.find({
    role: { $in: ['PHYSICIAN', 'CMO'] },
    accountStatus: 'ACTIVE',
    $or: [
      { 'demographics.legalName.first': regex },
      { 'demographics.legalName.last': regex },
      { 'physicianProfile.npiNumber': regex },
    ],
  })
    .limit(limit)
    .lean();

  return providers.map(formatProviderResult);
};

module.exports = {
  formatProviderResult,
  searchProviders,
};
