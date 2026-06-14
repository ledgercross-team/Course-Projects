const request = require('supertest');
const User = require('../../models/User');
const AdrReport = require('../../models/AdrReport');
const AuditLog = require('../../models/AuditLog');
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

describe('adrReports regulatory routes', () => {
  let patient;
  let physician;
  let seriousReport;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    patient = await User.create(buildPatient({ userId: 'patient-adr-reg-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(
      buildPhysician({ userId: 'physician-adr-reg-001', accountStatus: 'ACTIVE' })
    );

    await ConsentRule.create(
      buildFutureActiveConsent({
        consentId: 'consent-adr-reg-001',
        patientId: patient._id,
        providerId: physician._id,
        allowedDomains: ['CARDIOLOGY'],
      })
    );

    seriousReport = await AdrReport.create(
      buildAdrReport({
        patientId: patient._id,
        severity: 'SERIOUS',
        outcome: 'RECOVERING',
        meddraTerms: [{ lltCode: '10037844', lltTerm: 'Rash' }],
      })
    );

    await AdrReport.create(
      buildAdrReport({
        patientId: patient._id,
        severity: 'NON_SERIOUS',
        meddraTerms: [{ lltCode: '10028813', lltTerm: 'Nausea' }],
      })
    );
  });

  it('POST /api/adr-reports/:reportId/submit-regulatory returns 200 with faersSubmissionId and audit', async () => {
    const response = await request(app)
      .post(`/api/adr-reports/${seriousReport.reportId}/submit-regulatory`)
      .set('x-user-id', physician.userId)
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.faersSubmissionId).toMatch(/^faers-local-/);
    expect(response.body.report.regulatorySubmission.submittedToFda).toBe(true);

    const auditEntry = await AuditLog.findOne({
      eventType: 'ADR_REGULATORY_SUBMITTED',
      targetResourceId: seriousReport.reportId,
    }).lean();

    expect(auditEntry).not.toBeNull();
    expect(auditEntry.payload.faersSubmissionId).toBe(response.body.faersSubmissionId);
  });

  it('POST /api/adr-reports/:reportId/submit-regulatory returns 409 for NON_SERIOUS report', async () => {
    const nonSeriousReport = await AdrReport.findOne({ severity: 'NON_SERIOUS' }).lean();

    const response = await request(app)
      .post(`/api/adr-reports/${nonSeriousReport.reportId}/submit-regulatory`)
      .set('x-user-id', physician.userId)
      .send({});

    expect(response.status).toBe(409);
  });

  it('POST /api/adr-reports/:reportId/submit-regulatory returns 409 when already submitted', async () => {
    await request(app)
      .post(`/api/adr-reports/${seriousReport.reportId}/submit-regulatory`)
      .set('x-user-id', physician.userId)
      .send({});

    const response = await request(app)
      .post(`/api/adr-reports/${seriousReport.reportId}/submit-regulatory`)
      .set('x-user-id', physician.userId)
      .send({});

    expect(response.status).toBe(409);
  });

  it('POST /api/adr-reports/:reportId/submit-regulatory returns 403 for PATIENT role', async () => {
    const response = await request(app)
      .post(`/api/adr-reports/${seriousReport.reportId}/submit-regulatory`)
      .set('x-user-id', patient.userId)
      .send({});

    expect(response.status).toBe(403);
  });

  it('POST /api/adr-reports/:reportId/submit-regulatory returns 403 for PHYSICIAN without consent', async () => {
    const otherPhysician = await User.create(
      buildPhysician({
        userId: 'physician-adr-reg-002',
        accountStatus: 'ACTIVE',
        physicianProfile: {
          licenseNumber: 'MD-77777',
          npiNumber: '3333444455',
          specializations: ['CARDIOLOGY'],
          isCMO: false,
        },
      })
    );

    const response = await request(app)
      .post(`/api/adr-reports/${seriousReport.reportId}/submit-regulatory`)
      .set('x-user-id', otherPhysician.userId)
      .send({});

    expect(response.status).toBe(403);
  });
});
