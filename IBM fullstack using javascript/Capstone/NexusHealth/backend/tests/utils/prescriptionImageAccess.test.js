// backend/tests/utils/prescriptionImageAccess.test.js
const mongoose = require('mongoose');
const {
  assertPrescriptionImageUploadAccess,
  assertPrescriptionImageReadAccess,
  assertPrescriptionImageDeleteAccess,
} = require('../../utils/prescriptionImageAccess');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');

describe('prescriptionImageAccess', () => {
  const patientId = new mongoose.Types.ObjectId();
  const otherPatientId = new mongoose.Types.ObjectId();

  const patientUser = buildPatient({ _id: patientId });
  const physicianUser = buildPhysician({ _id: new mongoose.Types.ObjectId() });

  it('allows PATIENT self upload access and returns canonical patient ObjectId', () => {
    const result = assertPrescriptionImageUploadAccess(patientUser, patientId);

    expect(result.toString()).toBe(patientId.toString());
  });

  it('allows PATIENT self read and delete access', () => {
    expect(assertPrescriptionImageReadAccess(patientUser, patientId).toString()).toBe(
      patientId.toString()
    );
    expect(assertPrescriptionImageDeleteAccess(patientUser, patientId).toString()).toBe(
      patientId.toString()
    );
  });

  it('rejects PATIENT accessing another patient with 403', () => {
    expect(() => assertPrescriptionImageUploadAccess(patientUser, otherPatientId)).toThrow(
      expect.objectContaining({
        statusCode: 403,
        message: 'Patients may only upload prescription images for themselves',
      })
    );

    expect(() => assertPrescriptionImageReadAccess(patientUser, otherPatientId)).toThrow(
      expect.objectContaining({
        statusCode: 403,
        message: 'Patients may only access their own prescription images',
      })
    );
  });

  it('rejects non-patient roles with 403', () => {
    expect(() => assertPrescriptionImageUploadAccess(physicianUser, patientId)).toThrow(
      expect.objectContaining({
        statusCode: 403,
        message: 'Only patients may upload prescription images',
      })
    );

    expect(() => assertPrescriptionImageReadAccess(physicianUser, patientId)).toThrow(
      expect.objectContaining({
        statusCode: 403,
        message: 'Only patients may read prescription images',
      })
    );
  });

  it('rejects missing or invalid patientId with 400', () => {
    expect(() => assertPrescriptionImageUploadAccess(patientUser, undefined)).toThrow(
      expect.objectContaining({
        statusCode: 400,
        message: 'patientId is required',
      })
    );

    expect(() => assertPrescriptionImageUploadAccess(patientUser, 'not-an-object-id')).toThrow(
      expect.objectContaining({
        statusCode: 400,
        message: 'A valid patientId is required',
      })
    );
  });

  it('rejects missing auth user with 401', () => {
    expect(() => assertPrescriptionImageUploadAccess(undefined, patientId)).toThrow(
      expect.objectContaining({
        statusCode: 401,
        message: 'Authenticated user is required',
      })
    );
  });
});
