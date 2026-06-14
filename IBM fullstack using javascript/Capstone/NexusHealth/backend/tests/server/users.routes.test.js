// backend/tests/server/users.routes.test.js
const request = require('supertest');
const User = require('../../models/User');
const { app } = require('../../server');
const { buildPhysician, buildPatient } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');
const { hashPassword, issueAuthTokens } = require('../../services/authService');

describe('users routes', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    await User.create(
      buildPhysician({
        userId: 'physician-search-001',
        accountStatus: 'ACTIVE',
        demographics: {
          legalName: { first: 'Alice', last: 'Nguyen' },
          dateOfBirth: new Date('1980-03-10'),
          biologicalSex: 'F',
          contactInfo: {
            email: 'alice.nguyen@hospital.org',
            preferredContactMethod: 'EMAIL',
          },
        },
        physicianProfile: {
          licenseNumber: 'MD-55555',
          npiNumber: '1999888777',
          specializations: ['CARDIOLOGY'],
          isCMO: false,
        },
      }),
    );
  });

  it('GET /api/users/providers/search returns matching physicians', async () => {
    const response = await request(app).get('/api/users/providers/search').query({ q: 'Nguyen' });

    expect(response.status).toBe(200);
    expect(response.body.providers).toHaveLength(1);
    expect(response.body.providers[0].displayName).toContain('Nguyen');
    expect(response.body.providers[0].npiNumber).toBe('1999888777');
  });

  it('GET /api/users/me returns patient MRN and assigns one when missing', async () => {
    const hashedPassword = await hashPassword('Password123!');
    const patient = await User.create(
      buildPatient({
        userId: 'patient-users-me-001',
        accountStatus: 'ACTIVE',
        credentials: { hashedPassword },
        demographics: {
          legalName: { first: 'Pat', last: 'One' },
          dateOfBirth: new Date('1990-01-15'),
          biologicalSex: 'F',
          contactInfo: {
            email: 'pat.one@example.com',
            preferredContactMethod: 'EMAIL',
          },
        },
      }),
    );

    await User.updateOne({ _id: patient._id }, { $unset: { 'patientProfile.mrn': '' } });
    const { accessToken } = await issueAuthTokens(patient);

    const response = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.displayName).toBe('Pat One');
    expect(response.body.mrn).toMatch(/^MRN-[A-Z0-9]+-\d{8}$/);
  });

  it('GET /api/users/me/doctors returns empty list when no care team', async () => {
    const hashedPassword = await hashPassword('Password123!');
    const patient = await User.create(
      buildPatient({
        userId: 'patient-doctors-empty-001',
        accountStatus: 'ACTIVE',
        credentials: { hashedPassword },
      }),
    );
    const { accessToken } = await issueAuthTokens(patient);

    const response = await request(app)
      .get('/api/users/me/doctors')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.doctors).toEqual([]);
  });

  it('POST /api/users/me/doctors adds physician and sets primary when first', async () => {
    const hashedPassword = await hashPassword('Password123!');
    const physician = await User.findOne({ userId: 'physician-search-001' });
    const patient = await User.create(
      buildPatient({
        userId: 'patient-doctors-add-001',
        accountStatus: 'ACTIVE',
        credentials: { hashedPassword },
      }),
    );
    const { accessToken } = await issueAuthTokens(patient);

    const response = await request(app)
      .post('/api/users/me/doctors')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ physicianId: physician._id.toString() });

    expect(response.status).toBe(201);
    expect(response.body.doctors).toHaveLength(1);
    expect(response.body.doctors[0].isPrimary).toBe(true);
    expect(response.body.doctors[0].npiNumber).toBe('1999888777');
  });

  it('DELETE /api/users/me/doctors/:physicianId removes physician from care team', async () => {
    const hashedPassword = await hashPassword('Password123!');
    const physician = await User.findOne({ userId: 'physician-search-001' });
    const patient = await User.create(
      buildPatient({
        userId: 'patient-doctors-remove-001',
        accountStatus: 'ACTIVE',
        credentials: { hashedPassword },
        patientProfile: {
          mrn: 'MRN-20001',
          primaryPhysicianId: physician._id,
          careTeamPhysicianIds: [physician._id],
        },
      }),
    );
    const { accessToken } = await issueAuthTokens(patient);

    const response = await request(app)
      .delete(`/api/users/me/doctors/${physician._id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.doctors).toEqual([]);
  });
});
