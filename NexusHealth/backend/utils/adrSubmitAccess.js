// backend/utils/adrSubmitAccess.js
const { ConsentRule } = require('../models');
const { assertProviderClinicalAccess } = require('./providerClinicalAccess');
const { isValidObjectId, toObjectId } = require('./objectId');

const assertPatientSelfAccess = (authUser, patientId, action = 'submit') => {
  const patientObjectId = toObjectId(patientId);

  if (authUser._id.toString() !== patientObjectId.toString()) {
    const error = new Error(
      action === 'read'
        ? 'Patients may only access their own ADR reports'
        : 'Patients may only submit ADR reports for themselves'
    );
    error.statusCode = 403;
    throw error;
  }
};

const assertPharmacistPatientConsent = async (patientId) => {
  const patientObjectId = toObjectId(patientId);

  const consent = await ConsentRule.findOne({
    patientId: patientObjectId,
    status: 'ACTIVE',
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!consent) {
    const error = new Error('No active consent authorizes ADR access for this patient');
    error.statusCode = 403;
    throw error;
  }
};

const assertAdrSubmitAccess = async (authUser, patientId) => {
  if (!patientId) {
    const error = new Error('patientId is required');
    error.statusCode = 400;
    throw error;
  }

  if (authUser.role === 'PATIENT') {
    assertPatientSelfAccess(authUser, patientId, 'submit');
    return;
  }

  if (authUser.role === 'PHYSICIAN') {
    await assertProviderClinicalAccess(authUser, patientId);
    return;
  }

  if (authUser.role === 'PHARMACIST') {
    await assertPharmacistPatientConsent(patientId);
    return;
  }

  const error = new Error('Role is not authorized to submit ADR reports');
  error.statusCode = 403;
  throw error;
};

const assertAdrReadAccess = async (authUser, patientId) => {
  if (!patientId) {
    const error = new Error('patientId is required');
    error.statusCode = 400;
    throw error;
  }

  if (!isValidObjectId(patientId)) {
    const error = new Error('A valid patientId is required');
    error.statusCode = 400;
    throw error;
  }

  if (authUser.role === 'PATIENT') {
    assertPatientSelfAccess(authUser, patientId, 'read');
    return;
  }

  if (authUser.role === 'PHYSICIAN' || authUser.role === 'CMO') {
    await assertProviderClinicalAccess(authUser, patientId);
    return;
  }

  if (authUser.role === 'PHARMACIST') {
    await assertPharmacistPatientConsent(patientId);
    return;
  }

  const error = new Error('Role is not authorized to read ADR reports');
  error.statusCode = 403;
  throw error;
};

module.exports = {
  assertAdrSubmitAccess,
  assertAdrReadAccess,
};
