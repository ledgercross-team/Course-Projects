const request = require('supertest');
const User = require('../../models/User');
const AdrReport = require('../../models/AdrReport');
const ConsentRule = require('../../models/ConsentRule');
const { app } = require('../../server');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { buildActiveConsent } = require('../helpers/consentFactory');
const { buildAdrReport } = require('../helpers/adrReportFactory');
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

describe('adrReports read routes', () => {
  let patient;
  let otherPatient;
  let physician;
  let patientReport;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    patient = await User.create(buildPatient({ userId: 'patient-adr-read-001', accountStatus: 'ACTIVE' }));
    otherPatient = await User.create(
      buildPatient({
        userId: 'patient-adr-read-002',
        accountStatus: 'ACTIVE',
        patientProfile: { mrn: 'MRN-READ-002', bloodType: 'A+' },
      })
    );
    physician = await User.create(
      buildPhysician({ userId: 'physician-adr-read-001', accountStatus: 'ACTIVE' })
    );

    await ConsentRule.create(
      buildFutureActiveConsent({
        consentId: 'consent-adr-read-001',
        patientId: patient._id,
        providerId: physician._id,
        allowedDomains: ['CARDIOLOGY'],
      })
    );

    patientReport = await AdrReport.create(
      buildAdrReport({
        patientId: patient._id,
        meddraTerms: [{ lltCode: '10037844', lltTerm: 'Rash' }],
      })
    );

    await AdrReport.create(
      buildAdrReport({
        patientId: patient._id,
        meddraTerms: [{ lltCode: '10028813', lltTerm: 'Nausea' }],
      })
    );
  });

  it('GET /api/adr-reports/patient/:patientId lists own reports for PATIENT', async () => {
    const response = await request(app)
      .get(`/api/adr-reports/patient/${patient._id}`)
      .set('x-user-id', patient.userId);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
    expect(response.body.reports).toHaveLength(2);
    expect(response.body.patientId).toBe(patient._id.toString());
  });

  it('GET /api/adr-reports/patient/:patientId returns 403 when PATIENT requests another patient', async () => {
    const response = await request(app)
      .get(`/api/adr-reports/patient/${otherPatient._id}`)
      .set('x-user-id', patient.userId);

    expect(response.status).toBe(403);
  });

  it('GET /api/adr-reports/patient/:patientId returns 200 for PHYSICIAN with consent', async () => {
    const response = await request(app)
      .get(`/api/adr-reports/patient/${patient._id}`)
      .set('x-user-id', physician.userId);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
  });

  it('GET /api/adr-reports/patient/:patientId returns 403 for PHYSICIAN without consent', async () => {
    const otherPhysician = await User.create(
      buildPhysician({
        userId: 'physician-adr-read-002',
        accountStatus: 'ACTIVE',
        physicianProfile: {
          licenseNumber: 'MD-88888',
          npiNumber: '2222333344',
          specializations: ['CARDIOLOGY'],
          isCMO: false,
        },
      })
    );

    const response = await request(app)
      .get(`/api/adr-reports/patient/${patient._id}`)
      .set('x-user-id', otherPhysician.userId);

    expect(response.status).toBe(403);
  });

  it('GET /api/adr-reports/:reportId returns 404 for PATIENT accessing another patient report', async () => {
    const response = await request(app)
      .get(`/api/adr-reports/${patientReport.reportId}`)
      .set('x-user-id', otherPatient.userId);

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/not found/i);
  });

  it('GET /api/adr-reports/patient/:patientId returns 400 for invalid patientId', async () => {
    const response = await request(app)
      .get('/api/adr-reports/patient/not-a-valid-object-id')
      .set('x-user-id', physician.userId);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/patientId/i);
  });
});
