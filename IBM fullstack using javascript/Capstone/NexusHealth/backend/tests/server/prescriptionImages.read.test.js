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
const { deletePrescriptionImage } = require('../../utils/cloudinaryClient');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { buildClinicalRecord } = require('../helpers/clinicalRecordFactory');
const { buildPrescriptionImage } = require('../helpers/prescriptionImageFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('prescriptionImages read routes', () => {
  let patient;
  let otherPatient;
  let physician;
  let clinicalRecord;
  let image;

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
      buildPatient({ userId: 'patient-rximg-read-001', accountStatus: 'ACTIVE' })
    );
    otherPatient = await User.create(
      buildPatient({
        userId: 'patient-rximg-read-002',
        accountStatus: 'ACTIVE',
        patientProfile: { mrn: 'MRN-RXIMG-READ-002', bloodType: 'A+' },
      })
    );
    physician = await User.create(
      buildPhysician({ userId: 'physician-rximg-read-001', accountStatus: 'ACTIVE' })
    );

    clinicalRecord = await ClinicalRecord.create(
      buildClinicalRecord({ patientId: patient._id, recordId: 'rec-rximg-read-001' })
    );

    image = await PrescriptionImage.create(
      buildPrescriptionImage({
        patientId: patient._id,
        clinicalRecordId: clinicalRecord._id,
        clinicalRecordRecordId: clinicalRecord.recordId,
      })
    );

    await ClinicalRecord.updateOne(
      { _id: clinicalRecord._id },
      { $push: { prescriptionImageIds: image._id } }
    );

    await PrescriptionImage.create(
      buildPrescriptionImage({
        patientId: patient._id,
        clinicalRecordId: clinicalRecord._id,
        clinicalRecordRecordId: clinicalRecord.recordId,
      })
    );

    deletePrescriptionImage.mockResolvedValue({
      publicId: image.cloudinaryPublicId,
      result: 'ok',
    });
  });

  it('GET /api/prescription-images/patient/:patientId/record/:recordId lists images for PATIENT self', async () => {
    const response = await request(app)
      .get(
        `/api/prescription-images/patient/${patient._id}/record/${clinicalRecord.recordId}`
      )
      .set('x-user-id', patient.userId);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
    expect(response.body.images).toHaveLength(2);
    expect(response.body.recordId).toBe(clinicalRecord.recordId);
  });

  it('GET /api/prescription-images/patient/:patientId/record/:recordId returns 403 for another patient', async () => {
    const response = await request(app)
      .get(
        `/api/prescription-images/patient/${otherPatient._id}/record/${clinicalRecord.recordId}`
      )
      .set('x-user-id', patient.userId);

    expect(response.status).toBe(403);
  });

  it('GET /api/prescription-images/:imageId returns image detail for owner', async () => {
    const response = await request(app)
      .get(`/api/prescription-images/${image.imageId}`)
      .set('x-user-id', patient.userId);

    expect(response.status).toBe(200);
    expect(response.body.image.imageId).toBe(image.imageId);
  });

  it('GET /api/prescription-images/:imageId returns 404 for another patient (anti-leak)', async () => {
    const response = await request(app)
      .get(`/api/prescription-images/${image.imageId}`)
      .set('x-user-id', otherPatient.userId);

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/not found/i);
  });

  it('GET /api/prescription-images/:imageId returns 404 when imageId does not exist', async () => {
    const response = await request(app)
      .get('/api/prescription-images/rximg-00000000-0000-4000-8000-000000000000')
      .set('x-user-id', patient.userId);

    expect(response.status).toBe(404);
  });

  it('GET list returns 403 for PHYSICIAN', async () => {
    const response = await request(app)
      .get(
        `/api/prescription-images/patient/${patient._id}/record/${clinicalRecord.recordId}`
      )
      .set('x-user-id', physician.userId);

    expect(response.status).toBe(403);
  });

  it('DELETE /api/prescription-images/:imageId removes image, unlinks record, and writes audit', async () => {
    const response = await request(app)
      .delete(`/api/prescription-images/${image.imageId}`)
      .set('x-user-id', patient.userId);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ imageId: image.imageId, deleted: true });

    expect(await PrescriptionImage.countDocuments({ imageId: image.imageId })).toBe(0);
    expect(deletePrescriptionImage).toHaveBeenCalledWith(image.cloudinaryPublicId);

    const updatedRecord = await ClinicalRecord.findById(clinicalRecord._id).lean();
    expect(updatedRecord.prescriptionImageIds.map(String)).not.toContain(String(image._id));

    const auditEntry = await AuditLog.findOne({
      eventType: 'PRESCRIPTION_IMAGE_DELETED',
      targetResourceId: image.imageId,
    }).lean();

    expect(auditEntry).not.toBeNull();
  });

  it('DELETE /api/prescription-images/:imageId returns 403 for another patient', async () => {
    const response = await request(app)
      .delete(`/api/prescription-images/${image.imageId}`)
      .set('x-user-id', otherPatient.userId);

    expect(response.status).toBe(403);
    expect(await PrescriptionImage.countDocuments({ imageId: image.imageId })).toBe(1);
    expect(deletePrescriptionImage).not.toHaveBeenCalled();
  });
});
