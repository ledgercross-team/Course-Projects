// backend/tests/services/mrnService.test.js
const User = require('../../models/User');
const { buildPatient } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');
const { generateUniqueMrn, ensurePatientMrn } = require('../../services/mrnService');

describe('mrnService', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('generateUniqueMrn returns an MRN-prefixed value', async () => {
    const mrn = await generateUniqueMrn();
    expect(mrn).toMatch(/^MRN-[A-Z0-9]+-\d{8}$/);
  });

  it('ensurePatientMrn assigns an MRN when missing', async () => {
    const patient = await User.create(
      buildPatient({
        userId: 'patient-mrn-001',
      }),
    );

    await User.updateOne({ _id: patient._id }, { $unset: { 'patientProfile.mrn': '' } });
    const patientWithoutMrn = await User.findById(patient._id).lean();

    const mrn = await ensurePatientMrn(patientWithoutMrn);
    expect(mrn).toMatch(/^MRN-[A-Z0-9]+-\d{8}$/);

    const refreshed = await User.findById(patient._id).lean();
    expect(refreshed.patientProfile.mrn).toBe(mrn);
  });

  it('ensurePatientMrn returns existing MRN without changing it', async () => {
    const patient = await User.create(
      buildPatient({
        userId: 'patient-mrn-002',
        patientProfile: { mrn: 'MRN-10000001', bloodType: 'O+' },
      }),
    );

    const mrn = await ensurePatientMrn(patient);
    expect(mrn).toBe('MRN-10000001');
  });
});
