// backend/utils/prescriptionImageAccess.js
const { isValidObjectId, toObjectId } = require('./objectId');

const ACTION_MESSAGES = {
  upload: {
    role: 'Only patients may upload prescription images',
    self: 'Patients may only upload prescription images for themselves',
  },
  read: {
    role: 'Only patients may read prescription images',
    self: 'Patients may only access their own prescription images',
  },
  delete: {
    role: 'Only patients may delete prescription images',
    self: 'Patients may only delete their own prescription images',
  },
};

const assertPrescriptionImagePatientAccess = (authUser, patientId, action = 'upload') => {
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

  if (!authUser?._id) {
    const error = new Error('Authenticated user is required');
    error.statusCode = 401;
    throw error;
  }

  const messages = ACTION_MESSAGES[action] || ACTION_MESSAGES.upload;

  if (authUser.role !== 'PATIENT') {
    const error = new Error(messages.role);
    error.statusCode = 403;
    throw error;
  }

  const patientObjectId = toObjectId(patientId);

  if (authUser._id.toString() !== patientObjectId.toString()) {
    const error = new Error(messages.self);
    error.statusCode = 403;
    throw error;
  }

  return patientObjectId;
};

const assertPrescriptionImageUploadAccess = (authUser, patientId) =>
  assertPrescriptionImagePatientAccess(authUser, patientId, 'upload');

const assertPrescriptionImageReadAccess = (authUser, patientId) =>
  assertPrescriptionImagePatientAccess(authUser, patientId, 'read');

const assertPrescriptionImageDeleteAccess = (authUser, patientId) =>
  assertPrescriptionImagePatientAccess(authUser, patientId, 'delete');

module.exports = {
  assertPrescriptionImageUploadAccess,
  assertPrescriptionImageReadAccess,
  assertPrescriptionImageDeleteAccess,
};
