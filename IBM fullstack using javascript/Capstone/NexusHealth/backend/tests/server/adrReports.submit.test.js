jest.mock('../../services/drugResolverService', () => ({
  resolveDrugName: jest.fn(),
}));

const request = require('supertest');
const User = require('../../models/User');
const ConsentRule = require('../../models/ConsentRule');
const AuditLog = require('../../models/AuditLog');
const AdrReport = require('../../models/AdrReport');
const { app } = require('../../server');
const { resolveDrugName } = require('../../services/drugResolverService');
const { UnresolvableDrugError } = require('../../services/drugResolverErrors');
const {
  buildPatient,
  buildPhysician,
  buildPharmacist,
  buildAdmin,
} = require('../helpers/userFactory');
const { buildActiveConsent } = require('../helpers/consentFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

const buildFutureActiveConsent = (overrides = {}) => {
  const grantedAt = new Date('2026-06-01T10:00:00.000Z');
  const expiresAt = new Date('2026-08-01T10:00:00.000Z');

  return buildActiveConsent({
    grantedAt,
    expiresAt,
    ...overrides,
  });
};

describe('adrReports submit routes', () => {
  let patient;
  let physician;
  let pharmacist;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();

    patient = await User.create(buildPatient({ userId: 'patient-adr-route-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(
      buildPhysician({ userId: 'physician-adr-route-001', accountStatus: 'ACTIVE' })
    );
    pharmacist = await User.create(
      buildPharmacist({ userId: 'pharmacist-adr-route-001', accountStatus: 'ACTIVE' })
    );

    await ConsentRule.create(
      buildFutureActiveConsent({
        consentId: 'consent-adr-route-001',
        patientId: patient._id,
        providerId: physician._id,
        allowedDomains: ['CARDIOLOGY'],
      })
    );

    resolveDrugName.mockResolvedValue({
      rxcui: '1191',
      name: 'Aspirin',
      source: 'RXCHECK',
    });
  });

  const buildPayload = (overrides = {}) => ({
    patientId: patient._id.toString(),
    suspectedDrug: { drugName: 'Aspirin' },
    meddraTerms: [{ lltCode: '10037844', lltTerm: 'Rash' }],
    severity: 'NON_SERIOUS',
    outcome: 'UNKNOWN',
    ...overrides,
  });

  it('POST /api/adr-reports returns 201 for PATIENT self-report and writes audit', async () => {
    const response = await request(app)
      .post('/api/adr-reports')
      .set('x-user-id', patient.userId)
      .send(buildPayload());

    expect(response.status).toBe(201);
    expect(response.body.report.reportId).toMatch(/^adr-/i);
    expect(response.body.report.reportedBy).toBe('PATIENT');

    const auditEntry = await AuditLog.findOne({
      eventType: 'ADR_REPORTED',
      targetResourceId: response.body.report.reportId,
    }).lean();

    expect(auditEntry).not.toBeNull();
  });

  it('POST /api/adr-reports returns 201 for PHYSICIAN with active consent', async () => {
    const response = await request(app)
      .post('/api/adr-reports')
      .set('x-user-id', physician.userId)
      .send(buildPayload());

    expect(response.status).toBe(201);
    expect(response.body.report.reportedBy).toBe('PHYSICIAN');
  });

  it('POST /api/adr-reports returns 403 for PHYSICIAN without consent', async () => {
    const otherPhysician = await User.create(
      buildPhysician({
        userId: 'physician-adr-route-002',
        accountStatus: 'ACTIVE',
        physicianProfile: {
          licenseNumber: 'MD-99999',
          npiNumber: '1111222233',
          specializations: ['CARDIOLOGY'],
          isCMO: false,
        },
      })
    );

    const response = await request(app)
      .post('/api/adr-reports')
      .set('x-user-id', otherPhysician.userId)
      .send(buildPayload());

    expect(response.status).toBe(403);
    expect(await AdrReport.countDocuments()).toBe(0);
  });

  it('POST /api/adr-reports returns 201 for PHARMACIST when patient has active consent', async () => {
    const response = await request(app)
      .post('/api/adr-reports')
      .set('x-user-id', pharmacist.userId)
      .send(buildPayload());

    expect(response.status).toBe(201);
    expect(response.body.report.reportedBy).toBe('PHARMACIST');
  });

  it('POST /api/adr-reports returns 400 when meddraTerms is missing', async () => {
    const response = await request(app)
      .post('/api/adr-reports')
      .set('x-user-id', patient.userId)
      .send(buildPayload({ meddraTerms: [] }));

    expect(response.status).toBe(400);
    expect(await AdrReport.countDocuments()).toBe(0);
  });

  it('POST /api/adr-reports returns 400 for unresolvable drug name', async () => {
    resolveDrugName.mockRejectedValue(new UnresolvableDrugError('Drug name could not be resolved'));

    const response = await request(app)
      .post('/api/adr-reports')
      .set('x-user-id', patient.userId)
      .send(buildPayload({ suspectedDrug: { drugName: 'Asprin' } }));

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('unresolvable_drug');
    expect(await AdrReport.countDocuments()).toBe(0);
  });

  it('POST /api/adr-reports returns 403 for ADMIN role', async () => {
    const admin = await User.create(buildAdmin({ userId: 'admin-adr-route-001', accountStatus: 'ACTIVE' }));

    const response = await request(app)
      .post('/api/adr-reports')
      .set('x-user-id', admin.userId)
      .send(buildPayload());

    expect(response.status).toBe(403);
    expect(await AdrReport.countDocuments()).toBe(0);
  });
});
