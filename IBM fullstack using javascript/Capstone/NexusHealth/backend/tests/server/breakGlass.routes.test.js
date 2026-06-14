const request = require('supertest');
const User = require('../../models/User');
const { app } = require('../../server');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('break-glass routes', () => {
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

    patient = await User.create(buildPatient({ userId: 'patient-bg-http-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(
      buildPhysician({ userId: 'physician-bg-http-001', accountStatus: 'ACTIVE' })
    );
  });

  it('POST /api/break-glass/tier1 creates an override for physicians', async () => {
    const response = await request(app)
      .post('/api/break-glass/tier1')
      .set('x-user-id', physician.userId)
      .send({
        targetPatientId: patient._id.toString(),
        clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
        freeTextReason: 'Acute respiratory failure',
      });

    expect(response.status).toBe(201);
    expect(response.body.breakGlass.tier).toBe('TIER_1_SOFT_OVERRIDE');
    expect(response.body.sessionExpiresAt).toBeDefined();
    expect(response.body.escalationDueBy).toBeDefined();
  });

  it('returns 403 when a non-physician attempts Tier 1 override', async () => {
    const response = await request(app)
      .post('/api/break-glass/tier1')
      .set('x-user-id', patient.userId)
      .send({
        targetPatientId: patient._id.toString(),
        clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
        freeTextReason: 'Should not be allowed',
      });

    expect(response.status).toBe(403);
  });

  it('allows clinical reads after Tier 1 override without consent', async () => {
    await request(app)
      .post('/api/break-glass/tier1')
      .set('x-user-id', physician.userId)
      .send({
        targetPatientId: patient._id.toString(),
        clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
        freeTextReason: 'Emergency access required',
      });

    const readResponse = await request(app)
      .get(`/api/clinical-records/patient/${patient._id}`)
      .set('x-user-id', physician.userId);

    expect(readResponse.status).toBe(200);
    expect(readResponse.body.scope).toBe('BREAK_GLASS_TIER1');
  });

  it('POST /api/break-glass/override routes to Tier 1 for standard domains', async () => {
    const response = await request(app)
      .post('/api/break-glass/override')
      .set('x-user-id', physician.userId)
      .send({
        targetPatientId: patient._id.toString(),
        clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
        freeTextReason: 'Unified override endpoint standard domain test',
        affectedDomains: ['CARDIOLOGY'],
      });

    expect(response.status).toBe(201);
    expect(response.body.tier).toBe('TIER_1_SOFT_OVERRIDE');
    expect(response.body.breakGlass.tier).toBe('TIER_1_SOFT_OVERRIDE');
  });
});
