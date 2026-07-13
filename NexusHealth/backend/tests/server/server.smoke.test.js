const request = require('supertest');
const User = require('../../models/User');
const { app } = require('../../server');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('server HTTP smoke tests', () => {
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

    patient = await User.create(buildPatient({ userId: 'patient-http-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(buildPhysician({ userId: 'physician-http-001', accountStatus: 'ACTIVE' }));
  });

  it('GET /health returns db ok when MongoDB is connected', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ db: 'ok' });
  });

  it('GET / returns API metadata', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body.health).toBe('/health');
  });

  it('returns 401 when x-user-id header is missing', async () => {
    const response = await request(app).get(`/api/clinical-records/patient/${patient._id}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/authentication required/i);
  });

  it('returns 403 when physician has no active consent', async () => {
    const response = await request(app)
      .get(`/api/clinical-records/patient/${patient._id}`)
      .set('x-user-id', physician.userId);

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/consent/i);
  });

  it('returns 400 for invalid patientId on clinical record routes', async () => {
    const response = await request(app)
      .get('/api/clinical-records/patient/not-a-valid-object-id')
      .set('x-user-id', patient.userId);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/valid patientId/i);
  });
});
