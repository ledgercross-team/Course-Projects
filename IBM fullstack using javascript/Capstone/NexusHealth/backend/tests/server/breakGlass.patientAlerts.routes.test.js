const request = require('supertest');
const User = require('../../models/User');
const { app } = require('../../server');
const { initiateTier1SoftOverride } = require('../../services/breakGlassService');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('break-glass patient alerts route', () => {
  let patient;
  let physician;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    patient = await User.create(buildPatient({ userId: 'patient-bg-alert-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(
      buildPhysician({ userId: 'physician-bg-alert-001', accountStatus: 'ACTIVE' }),
    );
  });

  it('GET /api/break-glass/patient/alerts returns recent break-glass events for the patient', async () => {
    await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
      freeTextReason: 'Patient alert route integration test event',
    });

    const response = await request(app)
      .get('/api/break-glass/patient/alerts')
      .set('x-user-id', patient.userId);

    expect(response.status).toBe(200);
    expect(response.body.count).toBeGreaterThanOrEqual(1);
    expect(response.body.alerts[0].tier).toBe('TIER_1_SOFT_OVERRIDE');
    expect(response.body.alerts[0].message).toMatch(/emergency break-glass/i);
  });
});
