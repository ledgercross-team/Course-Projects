// backend/tests/services/clinicalRecordBootstrapService.test.js
const mongoose = require('mongoose');
const ClinicalRecord = require('../../models/ClinicalRecord');
const User = require('../../models/User');
const {
  ensurePatientClinicalRecord,
  resolveBootstrapDomain,
} = require('../../services/clinicalRecordBootstrapService');
const { buildPatient } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('clinicalRecordBootstrapService', () => {
  let patient;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    patient = await User.create(buildPatient({ userId: 'patient-bootstrap-001' }));
  });

  it('creates a clinical record when patient has none', async () => {
    const physicianId = new mongoose.Types.ObjectId();

    const record = await ensurePatientClinicalRecord(patient._id, {
      consent: { allowedDomains: ['CARDIOLOGY'] },
      prescribingPhysicianId: physicianId,
    });

    expect(record.recordId).toMatch(/^rec-/);
    expect(record.domain).toBe('CARDIOLOGY');
    expect(record.patientId.toString()).toBe(patient._id.toString());
    expect(record.medications.activeList).toEqual([]);
    expect(record.recordingPhysicianId.toString()).toBe(physicianId.toString());

    const count = await ClinicalRecord.countDocuments({ patientId: patient._id });
    expect(count).toBe(1);
  });

  it('returns existing record without creating a duplicate', async () => {
    await ClinicalRecord.create({
      recordId: 'rec-existing-001',
      patientId: patient._id,
      domain: 'NEUROLOGY',
      medications: { activeList: [], discontinuedList: [] },
    });

    const record = await ensurePatientClinicalRecord(patient._id, {
      consent: { allowedDomains: ['CARDIOLOGY'] },
    });

    expect(record.recordId).toBe('rec-existing-001');
    expect(await ClinicalRecord.countDocuments({ patientId: patient._id })).toBe(1);
  });

  it('defaults domain to GENERAL_PRACTICE when consent has no allowedDomains', () => {
    expect(resolveBootstrapDomain(null)).toBe('GENERAL_PRACTICE');
    expect(resolveBootstrapDomain({ allowedDomains: [] })).toBe('GENERAL_PRACTICE');
  });
});
