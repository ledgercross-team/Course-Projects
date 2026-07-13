// backend/tests/server/auth.routes.test.js
const request = require('supertest');
const User = require('../../models/User');
const { app } = require('../../server');
const { buildPhysician } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');
const { hashPassword } = require('../../services/authService');

describe('auth routes', () => {
  let physician;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    const hashedPassword = await hashPassword('Password123!');
    physician = await User.create(
      buildPhysician({
        userId: 'physician-auth-001',
        accountStatus: 'ACTIVE',
        demographics: {
          legalName: { first: 'John', last: 'Smith' },
          dateOfBirth: new Date('1975-06-20'),
          biologicalSex: 'M',
          contactInfo: {
            email: 'john.smith@hospital.org',
            preferredContactMethod: 'EMAIL',
          },
        },
        credentials: { hashedPassword },
      }),
    );
  });

  it('POST /api/auth/register creates a patient and returns access token', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'jane.doe@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe',
        dateOfBirth: '1990-01-15',
        primaryPhysicianId: physician._id.toString(),
      });

    expect(response.status).toBe(201);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.user.role).toBe('PATIENT');
    expect(response.body.user.patientProfile.mrn).toMatch(/^MRN-[A-Z0-9]+-\d{8}$/);
    expect(response.body.user.patientProfile.primaryPhysicianId).toBeDefined();
  });

  it('POST /api/auth/register accepts passwords with at least 3 characters', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'short.pw@example.com',
        password: 'abc',
        firstName: 'Short',
        lastName: 'Password',
        dateOfBirth: '1990-01-15',
      });

    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe('PATIENT');
    expect(response.body.user.patientProfile.mrn).toMatch(/^MRN-[A-Z0-9]+-\d{8}$/);
  });

  it('POST /api/auth/register rejects passwords shorter than 3 characters', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'tiny.pw@example.com',
        password: 'ab',
        firstName: 'Tiny',
        lastName: 'Password',
        dateOfBirth: '1990-01-15',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/at least 3 characters/i);
  });

  it('POST /api/auth/login returns token for valid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'login.user@example.com',
        password: 'Password123!',
        firstName: 'Login',
        lastName: 'User',
        dateOfBirth: '1990-01-15',
      });

    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login.user@example.com',
        password: 'Password123!',
      });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();
    expect(response.body.user.role).toBe('PATIENT');
    expect(response.body.user.patientProfile.mrn).toMatch(/^MRN-[A-Z0-9]+-\d{8}$/);
  });

  it('GET /api/auth/me returns profile for bearer token', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'me.user@example.com',
        password: 'Password123!',
        firstName: 'Me',
        lastName: 'User',
        dateOfBirth: '1990-01-15',
      });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.user.demographics.contactInfo.email).toBe('me.user@example.com');
    expect(response.body.user.patientProfile.mrn).toMatch(/^MRN-[A-Z0-9]+-\d{8}$/);
  });

  it('PATCH /api/auth/me updates optional phone number', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'phone.user@example.com',
        password: 'Password123!',
        firstName: 'Phone',
        lastName: 'User',
        dateOfBirth: '1990-01-15',
      });

    const response = await request(app)
      .patch('/api/auth/me')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .send({ primaryPhone: '+1 555 0100' });

    expect(response.status).toBe(200);
    expect(response.body.user.demographics.contactInfo.primaryPhone).toBe('+1 555 0100');
  });

  it('POST /api/auth/change-password updates password', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'changepw.user@example.com',
        password: 'Password123!',
        firstName: 'Change',
        lastName: 'Password',
        dateOfBirth: '1990-01-15',
      });

    const response = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .send({
        currentPassword: 'Password123!',
        newPassword: 'NewPassword456!',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const loginOld = await request(app)
      .post('/api/auth/login')
      .send({ email: 'changepw.user@example.com', password: 'Password123!' });
    expect(loginOld.status).toBe(401);

    const loginNew = await request(app)
      .post('/api/auth/login')
      .send({ email: 'changepw.user@example.com', password: 'NewPassword456!' });
    expect(loginNew.status).toBe(200);
  });

  it('DELETE /api/auth/me suspends account after password confirmation', async () => {
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'delete.user@example.com',
        password: 'Password123!',
        firstName: 'Delete',
        lastName: 'User',
        dateOfBirth: '1990-01-15',
      });

    const response = await request(app)
      .delete('/api/auth/me')
      .set('Authorization', `Bearer ${registerResponse.body.accessToken}`)
      .send({ password: 'Password123!' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'delete.user@example.com', password: 'Password123!' });
    expect(loginResponse.status).toBe(403);
  });
});
