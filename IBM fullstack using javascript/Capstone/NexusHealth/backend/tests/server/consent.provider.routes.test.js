// backend/tests/server/consent.provider.routes.test.js
const request = require('supertest');
const User = require('../../models/User');
const ConsentRule = require('../../models/ConsentRule');
const { app } = require('../../server');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { buildActiveConsent, buildConsentRule } = require('../helpers/consentFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');
const { hashPassword, issueAuthTokens } = require('../../services/authService');

describe('consent provider routes', () => {
  let physician;
  let patientA;
  let patientB;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    physician = await User.create(
      buildPhysician({ userId: 'physician-provider-consent-001', accountStatus: 'ACTIVE' }),
    );
    patientA = await User.create(
      buildPatient({
        userId: 'patient-provider-consent-a',
        patientProfile: { mrn: 'MRN-ALPHA-001', bloodType: 'O+' },
        demographics: {
          legalName: { first: 'Alice', last: 'Alpha' },
          dateOfBirth: new Date('1990-01-15'),
          biologicalSex: 'F',
          contactInfo: { email: 'alice@example.com', preferredContactMethod: 'EMAIL' },
        },
      }),
    );
    patientB = await User.create(
      buildPatient({
        userId: 'patient-provider-consent-b',
        patientProfile: { mrn: 'MRN-BETA-002', bloodType: 'A+' },
        demographics: {
          legalName: { first: 'Bob', last: 'Beta' },
          dateOfBirth: new Date('1985-06-20'),
          biologicalSex: 'M',
          contactInfo: { email: 'bob@example.com', preferredContactMethod: 'EMAIL' },
        },
      }),
    );

    await ConsentRule.create(
      buildActiveConsent({
        consentId: 'consent-provider-a',
        patientId: patientA._id,
        providerId: physician._id,
      }),
    );
    await ConsentRule.create(
      buildConsentRule({
        consentId: 'consent-provider-b',
        patientId: patientB._id,
        providerId: physician._id,
      }),
    );
  });

  it('GET /api/consent/provider/mine returns consents with patient MRN for physician', async () => {
    const { accessToken } = await issueAuthTokens(physician);

    const response = await request(app)
      .get('/api/consent/provider/mine')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.consents).toHaveLength(2);
    expect(response.body.consents[0].patient.mrn).toBeDefined();
    expect(response.body.consents[0].patient.displayName).toBeTruthy();
  });

  it('GET /api/consent/provider/mine filters by partial MRN', async () => {
    const { accessToken } = await issueAuthTokens(physician);

    const response = await request(app)
      .get('/api/consent/provider/mine')
      .query({ mrn: 'ALPHA' })
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.consents).toHaveLength(1);
    expect(response.body.consents[0].patient.mrn).toBe('MRN-ALPHA-001');
    expect(response.body.consents[0].patient.displayName).toBe('Alice Alpha');
  });

  it('GET /api/consent/provider/mine returns 403 for patients', async () => {
    const hashedPassword = await hashPassword('Password123!');
    const patient = await User.create(
      buildPatient({
        userId: 'patient-provider-consent-forbidden',
        accountStatus: 'ACTIVE',
        credentials: { hashedPassword },
      }),
    );
    const { accessToken } = await issueAuthTokens(patient);

    const response = await request(app)
      .get('/api/consent/provider/mine')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(403);
  });
});
