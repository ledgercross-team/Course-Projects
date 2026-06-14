// backend/tests/services/prescriptionImageService.test.js
const User = require('../../models/User');
const PrescriptionImage = require('../../models/PrescriptionImage');
const ClinicalRecord = require('../../models/ClinicalRecord');
const AuditLog = require('../../models/AuditLog');
const { createPrescriptionImageService } = require('../../services/prescriptionImageService');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { buildClinicalRecord } = require('../helpers/clinicalRecordFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('prescriptionImageService', () => {
  let patient;
  let uploadPrescriptionImageImpl;
  let deletePrescriptionImageImpl;
  let createPrescriptionImage;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    patient = await User.create(buildPatient({ userId: 'patient-rximg-001' }));

    uploadPrescriptionImageImpl = jest.fn().mockResolvedValue({
      publicId: 'healthplatform/prescriptions/patient/sample',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
      byteSize: 2048,
      mimeType: 'image/jpeg',
      originalFilename: 'prescription.jpg',
    });

    deletePrescriptionImageImpl = jest.fn().mockResolvedValue({
      publicId: 'healthplatform/prescriptions/patient/sample',
      result: 'ok',
    });

    ({ createPrescriptionImage } = createPrescriptionImageService({
      uploadPrescriptionImageImpl,
      deletePrescriptionImageImpl,
    }));
  });

  const buildUploadInput = (clinicalRecord, overrides = {}) => ({
    patientUser: patient,
    patientId: patient._id,
    recordId: clinicalRecord.recordId,
    buffer: Buffer.from('fake-image-bytes'),
    mimeType: 'image/jpeg',
    originalFilename: 'prescription.jpg',
    ...overrides,
  });

  it('creates PrescriptionImage, links clinical record, and writes PRESCRIPTION_IMAGE_UPLOADED audit', async () => {
    const clinicalRecord = await ClinicalRecord.create(
      buildClinicalRecord({ patientId: patient._id })
    );

    const image = await createPrescriptionImage(buildUploadInput(clinicalRecord));

    expect(image.imageId).toMatch(/^rximg-[0-9a-f-]{36}$/i);
    expect(image.cloudinaryPublicId).toBe('healthplatform/prescriptions/patient/sample');
    expect(image.clinicalRecordRecordId).toBe(clinicalRecord.recordId);

    const updatedRecord = await ClinicalRecord.findById(clinicalRecord._id).lean();
    expect(updatedRecord.prescriptionImageIds.map(String)).toContain(String(image._id));

    const auditEntry = await AuditLog.findOne({
      eventType: 'PRESCRIPTION_IMAGE_UPLOADED',
      targetResourceId: image.imageId,
    }).lean();

    expect(auditEntry).not.toBeNull();
    expect(auditEntry.targetResourceType).toBe('PrescriptionImage');
    expect(auditEntry.payload).toMatchObject({
      patientId: patient._id.toString(),
      clinicalRecordRecordId: clinicalRecord.recordId,
      mimeType: 'image/jpeg',
    });

    expect(uploadPrescriptionImageImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: patient._id.toString(),
        mimeType: 'image/jpeg',
        originalFilename: 'prescription.jpg',
      })
    );
  });

  it('returns 404 when recordId does not exist for the patient', async () => {
    await expect(
      createPrescriptionImage({
        patientUser: patient,
        patientId: patient._id,
        recordId: 'rec-missing',
        buffer: Buffer.from('fake-image-bytes'),
        mimeType: 'image/jpeg',
        originalFilename: 'prescription.jpg',
      })
    ).rejects.toMatchObject({ statusCode: 404 });

    expect(await PrescriptionImage.countDocuments()).toBe(0);
    expect(uploadPrescriptionImageImpl).not.toHaveBeenCalled();
    expect(await AuditLog.countDocuments()).toBe(0);
  });

  it('returns 404 when recordId belongs to a different patient', async () => {
    const otherPatient = await User.create(
      buildPatient({
        userId: 'patient-rximg-002',
        patientProfile: { mrn: 'MRN-RXIMG-002', bloodType: 'A+' },
      })
    );
    const clinicalRecord = await ClinicalRecord.create(
      buildClinicalRecord({ patientId: otherPatient._id })
    );

    await expect(createPrescriptionImage(buildUploadInput(clinicalRecord))).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(uploadPrescriptionImageImpl).not.toHaveBeenCalled();
    expect(await PrescriptionImage.countDocuments()).toBe(0);
  });

  it('compensates by deleting Mongo doc and Cloudinary asset when clinical record push fails', async () => {
    const clinicalRecord = await ClinicalRecord.create(
      buildClinicalRecord({ patientId: patient._id })
    );

    const ClinicalRecordModel = ClinicalRecord;
    const originalUpdateOne = ClinicalRecordModel.updateOne.bind(ClinicalRecordModel);

    jest.spyOn(ClinicalRecordModel, 'updateOne').mockImplementation(async (filter, update) => {
      if (update?.$push?.prescriptionImageIds) {
        return { matchedCount: 0, modifiedCount: 0, acknowledged: true };
      }

      return originalUpdateOne(filter, update);
    });

    const { createPrescriptionImage: createWithFailingPush } = createPrescriptionImageService({
      uploadPrescriptionImageImpl,
      deletePrescriptionImageImpl,
      ClinicalRecordModel,
    });

    await expect(createWithFailingPush(buildUploadInput(clinicalRecord))).rejects.toMatchObject({
      statusCode: 404,
    });

    expect(await PrescriptionImage.countDocuments()).toBe(0);
    expect(deletePrescriptionImageImpl).toHaveBeenCalledWith(
      'healthplatform/prescriptions/patient/sample'
    );
    expect(await AuditLog.countDocuments()).toBe(0);

    ClinicalRecordModel.updateOne.mockRestore();
  });

  it('rejects invalid mimeType with 400 and does not upload', async () => {
    const clinicalRecord = await ClinicalRecord.create(
      buildClinicalRecord({ patientId: patient._id })
    );

    await expect(
      createPrescriptionImage(
        buildUploadInput(clinicalRecord, {
          mimeType: 'image/gif',
        })
      )
    ).rejects.toMatchObject({ statusCode: 400 });

    expect(uploadPrescriptionImageImpl).not.toHaveBeenCalled();
    expect(await PrescriptionImage.countDocuments()).toBe(0);
  });

  it('rejects non-patient uploaders with 403', async () => {
    const physician = await User.create(buildPhysician({ userId: 'physician-rximg-001' }));
    const clinicalRecord = await ClinicalRecord.create(
      buildClinicalRecord({ patientId: patient._id })
    );

    await expect(
      createPrescriptionImage({
        ...buildUploadInput(clinicalRecord),
        patientUser: physician,
      })
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(uploadPrescriptionImageImpl).not.toHaveBeenCalled();
  });
});
