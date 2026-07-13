// backend/services/mrnService.js
const crypto = require('crypto');
const { User } = require('../models');

const MRN_PREFIX = 'MRN';
const MRN_RANDOM_LENGTH = 8;
const MAX_GENERATION_ATTEMPTS = 12;

const buildMrnCandidate = () => {
  const timePart = Date.now().toString(36).toUpperCase();
  const randomPart = crypto.randomInt(0, 10 ** MRN_RANDOM_LENGTH).toString().padStart(MRN_RANDOM_LENGTH, '0');
  return `${MRN_PREFIX}-${timePart}-${randomPart}`;
};

const mrnExists = async (mrn) => {
  const existing = await User.findOne({ 'patientProfile.mrn': mrn }).select('_id').lean();
  return Boolean(existing);
};

const generateUniqueMrn = async () => {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const mrn = buildMrnCandidate();
    if (!(await mrnExists(mrn))) {
      return mrn;
    }
  }

  const error = new Error('Unable to generate a unique MRN');
  error.statusCode = 500;
  throw error;
};

const ensurePatientMrn = async (userOrId) => {
  const user =
    typeof userOrId === 'object' && userOrId !== null
      ? userOrId
      : await User.findById(userOrId).lean();

  if (!user || user.role !== 'PATIENT') {
    return null;
  }

  if (user.patientProfile?.mrn) {
    return user.patientProfile.mrn;
  }

  const mrn = await generateUniqueMrn();
  await User.updateOne({ _id: user._id }, { $set: { 'patientProfile.mrn': mrn } });
  return mrn;
};

const isValidGeneratedMrn = (mrn) => typeof mrn === 'string' && /^MRN-[A-Z0-9]+-\d{8}$/.test(mrn);

const reassignInvalidOrDuplicateMrns = async () => {
  const patients = await User.find({ role: 'PATIENT' }).lean();
  const seen = new Map();
  let updated = 0;

  for (const patient of patients) {
    const currentMrn = patient.patientProfile?.mrn;
    const isDuplicate = currentMrn && seen.has(currentMrn);
    const needsReplacement = !currentMrn || !isValidGeneratedMrn(currentMrn) || isDuplicate;

    if (!needsReplacement) {
      seen.set(currentMrn, patient._id.toString());
      continue;
    }

    const mrn = await generateUniqueMrn();
    await User.updateOne({ _id: patient._id }, { $set: { 'patientProfile.mrn': mrn } });
    seen.set(mrn, patient._id.toString());
    updated += 1;
  }

  return updated;
};

const backfillMissingPatientMrns = async () => {
  const totalPatients = await User.countDocuments({ role: 'PATIENT' });
  const withMrn = await User.countDocuments({
    role: 'PATIENT',
    'patientProfile.mrn': { $exists: true, $nin: [null, ''] },
  });
  const patients = await User.find({
    role: 'PATIENT',
    $or: [{ 'patientProfile.mrn': { $exists: false } }, { 'patientProfile.mrn': null }, { 'patientProfile.mrn': '' }],
  }).lean();

  let updated = 0;
  for (const patient of patients) {
    await ensurePatientMrn(patient);
    updated += 1;
  }

  return updated;
};

module.exports = {
  MRN_PREFIX,
  MRN_RANDOM_LENGTH,
  generateUniqueMrn,
  ensurePatientMrn,
  backfillMissingPatientMrns,
  reassignInvalidOrDuplicateMrns,
};
