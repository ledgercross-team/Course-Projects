// backend/services/patientCareTeamService.js
const { User } = require('../models');
const { formatProviderResult } = require('./userLookupService');

const ACTIVE_PROVIDER_ROLES = ['PHYSICIAN', 'CMO'];

const assertActiveProvider = async (physicianId) => {
  const provider = await User.findById(physicianId).lean();
  if (!provider || !ACTIVE_PROVIDER_ROLES.includes(provider.role) || provider.accountStatus !== 'ACTIVE') {
    const error = new Error('physicianId must reference an active physician or CMO');
    error.statusCode = 400;
    throw error;
  }
  return provider;
};

const collectCareTeamIds = (patient) => {
  const ids = new Set(
    (patient.patientProfile?.careTeamPhysicianIds || []).map((id) => id.toString()),
  );
  const primaryId = patient.patientProfile?.primaryPhysicianId?.toString();
  if (primaryId) ids.add(primaryId);
  return [...ids];
};

const listCareTeamDoctors = async (patient) => {
  const physicianIds = collectCareTeamIds(patient);
  if (physicianIds.length === 0) {
    return [];
  }

  const primaryId = patient.patientProfile?.primaryPhysicianId?.toString();
  const providers = await User.find({
    _id: { $in: physicianIds },
    role: { $in: ACTIVE_PROVIDER_ROLES },
    accountStatus: 'ACTIVE',
  }).lean();

  return providers.map((provider) => ({
    ...formatProviderResult(provider),
    isPrimary: provider._id.toString() === primaryId,
  }));
};

const addCareTeamDoctor = async (patient, physicianId) => {
  await assertActiveProvider(physicianId);

  const patientId = patient._id.toString();
  const normalizedPhysicianId = physicianId.toString();
  const existingIds = (patient.patientProfile?.careTeamPhysicianIds || []).map((id) => id.toString());

  if (existingIds.includes(normalizedPhysicianId)) {
    const error = new Error('This physician is already on your care team');
    error.statusCode = 409;
    throw error;
  }

  const update = {
    $addToSet: { 'patientProfile.careTeamPhysicianIds': physicianId },
  };

  if (!patient.patientProfile?.primaryPhysicianId) {
    update.$set = { 'patientProfile.primaryPhysicianId': physicianId };
  }

  const updated = await User.findByIdAndUpdate(patientId, update, { returnDocument: 'after' }).lean();
  return listCareTeamDoctors(updated);
};

const removeCareTeamDoctor = async (patient, physicianId) => {
  const normalizedPhysicianId = physicianId.toString();
  const existingIds = (patient.patientProfile?.careTeamPhysicianIds || []).map((id) => id.toString());
  const primaryId = patient.patientProfile?.primaryPhysicianId?.toString();

  if (!existingIds.includes(normalizedPhysicianId) && primaryId !== normalizedPhysicianId) {
    const error = new Error('This physician is not on your care team');
    error.statusCode = 404;
    throw error;
  }

  const update = {
    $pull: { 'patientProfile.careTeamPhysicianIds': physicianId },
  };

  if (primaryId === normalizedPhysicianId) {
    update.$unset = { 'patientProfile.primaryPhysicianId': '' };
  }

  const updated = await User.findByIdAndUpdate(patient._id, update, { returnDocument: 'after' }).lean();
  return listCareTeamDoctors(updated);
};

module.exports = {
  assertActiveProvider,
  collectCareTeamIds,
  listCareTeamDoctors,
  addCareTeamDoctor,
  removeCareTeamDoctor,
};
