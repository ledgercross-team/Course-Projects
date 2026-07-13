const request = require('supertest');
const User = require('../../models/User');
const ClinicalRecord = require('../../models/ClinicalRecord');
const { app } = require('../../server');
const { buildPatient, buildPhysician, buildCmo } = require('../helpers/userFactory');
const { buildClinicalRecord } = require('../helpers/clinicalRecordFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('break-glass Tier 2 routes', () => {
  let patient;
  let physician;
  let cmo;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    patient = await User.create(buildPatient({ userId: 'patient-tier2-http-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(
      buildPhysician({ userId: 'physician-tier2-http-001', accountStatus: 'ACTIVE' })
    );
    cmo = await User.create(buildCmo({ userId: 'cmo-tier2-http-001', accountStatus: 'ACTIVE' }));

    await ClinicalRecord.create(
      buildClinicalRecord({
        recordId: 'rec-tier2-psych',
        patientId: patient._id,
        domain: 'PSYCHIATRY',
        episodeId: 'episode-tier2-001',
      })
    );
  });

  it('POST /api/break-glass/tier2 creates a pending request without immediate access', async () => {
    const createResponse = await request(app)
      .post('/api/break-glass/tier2')
      .set('x-user-id', physician.userId)
      .send({
        targetPatientId: patient._id.toString(),
        clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
        freeTextReason: 'Tier 2 emergency request',
      });

    expect(createResponse.status).toBe(202);
    expect(createResponse.body.reviewStatus).toBe('PENDING');

    const readResponse = await request(app)
      .get(`/api/clinical-records/patient/${patient._id}`)
      .set('x-user-id', physician.userId);

    expect(readResponse.status).toBe(403);
  });

  it('GET /api/break-glass/compliance-queue lists pending requests for CMO', async () => {
    await request(app)
      .post('/api/break-glass/tier2')
      .set('x-user-id', physician.userId)
      .send({
        targetPatientId: patient._id.toString(),
        clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
        freeTextReason: 'Queue listing test for compliance queue',
      });

    const queueResponse = await request(app)
      .get('/api/break-glass/compliance-queue')
      .set('x-user-id', cmo.userId);

    expect(queueResponse.status).toBe(200);
    expect(queueResponse.body.count).toBe(1);
    expect(queueResponse.body.requests[0].recordPhase).toBe('REQUEST');
  });

  it('approves Tier 2 request and unlocks clinical reads for the requesting physician', async () => {
    const createResponse = await request(app)
      .post('/api/break-glass/tier2')
      .set('x-user-id', physician.userId)
      .send({
        targetPatientId: patient._id.toString(),
        clinicalJustificationCode: 'UNCONSCIOUS_PATIENT',
        freeTextReason: 'Full chart required after approval',
      });

    const requestEventId = createResponse.body.breakGlass.eventId;

    const approveResponse = await request(app)
      .post(`/api/break-glass/${requestEventId}/approve`)
      .set('x-user-id', cmo.userId);

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.reviewStatus).toBe('CLEARED');
    expect(approveResponse.body.sessionExpiresAt).toBeDefined();

    const readResponse = await request(app)
      .get(`/api/clinical-records/patient/${patient._id}`)
      .set('x-user-id', physician.userId);

    expect(readResponse.status).toBe(200);
    expect(readResponse.body.scope).toBe('BREAK_GLASS_TIER2');
    expect(readResponse.body.records).toHaveLength(1);
  });

  it('GET /api/break-glass/:eventId/status returns resolution state', async () => {
    const createResponse = await request(app)
      .post('/api/break-glass/tier2')
      .set('x-user-id', physician.userId)
      .send({
        targetPatientId: patient._id.toString(),
        clinicalJustificationCode: 'TRANSFER_OF_CARE',
        freeTextReason: 'Status endpoint test',
      });

    const requestEventId = createResponse.body.breakGlass.eventId;

    const pendingStatus = await request(app)
      .get(`/api/break-glass/${requestEventId}/status`)
      .set('x-user-id', physician.userId);

    expect(pendingStatus.status).toBe(200);
    expect(pendingStatus.body.reviewStatus).toBe('PENDING');

    await request(app)
      .post(`/api/break-glass/${requestEventId}/approve`)
      .set('x-user-id', cmo.userId);

    const approvedStatus = await request(app)
      .get(`/api/break-glass/${requestEventId}/status`)
      .set('x-user-id', physician.userId);

    expect(approvedStatus.status).toBe(200);
    expect(approvedStatus.body.reviewStatus).toBe('CLEARED');
    expect(approvedStatus.body.sessionExpiresAt).toBeDefined();
  });
});
