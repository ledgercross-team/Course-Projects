jest.mock('../../utils/cloudinaryClient', () => ({
  uploadPrescriptionImage: jest.fn(),
  deletePrescriptionImage: jest.fn(),
}));

const request = require('supertest');
const User = require('../../models/User');
const ClinicalRecord = require('../../models/ClinicalRecord');
const PrescriptionImage = require('../../models/PrescriptionImage');
const AuditLog = require('../../models/AuditLog');
const { app } = require('../../server');
const {
  uploadPrescriptionImage,
  deletePrescriptionImage,
} = require('../../utils/cloudinaryClient');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { buildClinicalRecord } = require('../helpers/clinicalRecordFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('prescriptionImages upload routes', () => {
  let patient;
  let physician;
  let clinicalRecord;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();

    patient = await User.create(
      buildPatient({ userId: 'patient-rximg-route-001', accountStatus: 'ACTIVE' })
    );
    physician = await User.create(
      buildPhysician({ userId: 'physician-rximg-route-001', accountStatus: 'ACTIVE' })
    );

    clinicalRecord = await ClinicalRecord.create(
      buildClinicalRecord({ patientId: patient._id, recordId: 'rec-rximg-route-001' })
    );

    uploadPrescriptionImage.mockResolvedValue({
      publicId: 'healthplatform/prescriptions/patient/sample',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/v1/sample.jpg',
      byteSize: 2048,
    });

    deletePrescriptionImage.mockResolvedValue({
      publicId: 'healthplatform/prescriptions/patient/sample',
      result: 'ok',
    });
  });

  const uploadRequest = (user, fields = {}, fileOptions = {}) => {
    const req = request(app)
      .post('/api/prescription-images')
      .set('x-user-id', user.userId)
      .field('patientId', fields.patientId || patient._id.toString())
      .field('recordId', fields.recordId || clinicalRecord.recordId);

    if (fields.caption) {
      req.field('caption', fields.caption);
    }

    if (fileOptions.skipFile) {
      return req;
    }

    return req.attach(
      'file',
      fileOptions.buffer || Buffer.from('fake-image-bytes'),
      fileOptions.filename || 'prescription.jpg',
      fileOptions.contentType || 'image/jpeg'
    );
  };

  it('POST /api/prescription-images returns 201 for PATIENT self upload and writes audit', async () => {
    const response = await uploadRequest(patient, { caption: 'Morning dose' });

    expect(response.status).toBe(201);
    expect(response.body.image.imageId).toMatch(/^rximg-[0-9a-f-]{36}$/i);
    expect(response.body.image.caption).toBe('Morning dose');
    expect(response.body.image.clinicalRecordRecordId).toBe(clinicalRecord.recordId);

    const updatedRecord = await ClinicalRecord.findById(clinicalRecord._id).lean();
    expect(updatedRecord.prescriptionImageIds.length).toBe(1);

    const auditEntry = await AuditLog.findOne({
      eventType: 'PRESCRIPTION_IMAGE_UPLOADED',
      targetResourceId: response.body.image.imageId,
    }).lean();

    expect(auditEntry).not.toBeNull();
    expect(uploadPrescriptionImage).toHaveBeenCalledTimes(1);
  });

  it('POST /api/prescription-images returns 403 for PHYSICIAN', async () => {
    const response = await uploadRequest(physician);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Insufficient role for this operation');
    expect(await PrescriptionImage.countDocuments()).toBe(0);
    expect(uploadPrescriptionImage).not.toHaveBeenCalled();
  });

  it('POST /api/prescription-images returns 403 when patientId does not match auth user', async () => {
    const otherPatient = await User.create(
      buildPatient({
        userId: 'patient-rximg-route-002',
        accountStatus: 'ACTIVE',
        patientProfile: { mrn: 'MRN-RXIMG-002', bloodType: 'A+' },
      })
    );

    const response = await uploadRequest(patient, {
      patientId: otherPatient._id.toString(),
    });

    expect(response.status).toBe(403);
    expect(uploadPrescriptionImage).not.toHaveBeenCalled();
  });

  it('POST /api/prescription-images returns 404 for unknown recordId', async () => {
    const response = await uploadRequest(patient, { recordId: 'rec-does-not-exist' });

    expect(response.status).toBe(404);
    expect(uploadPrescriptionImage).not.toHaveBeenCalled();
  });

  it('POST /api/prescription-images returns 400 when file is missing', async () => {
    const response = await uploadRequest(patient, {}, { skipFile: true });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('file is required');
  });

  it('POST /api/prescription-images returns 400 for unsupported mime type', async () => {
    const response = await uploadRequest(
      patient,
      {},
      {
        filename: 'animation.gif',
        contentType: 'image/gif',
      }
    );

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid file type');
    expect(uploadPrescriptionImage).not.toHaveBeenCalled();
  });
});
