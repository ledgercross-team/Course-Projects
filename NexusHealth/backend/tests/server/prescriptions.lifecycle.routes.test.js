// backend/tests/server/prescriptions.lifecycle.routes.test.js
jest.mock('../../services/drugResolverService', () => ({
  resolveDrugName: jest.fn(),
}));

jest.mock('../../services/interactionCheckerService', () => ({
  checkPair: jest.fn(),
}));

jest.mock('../../services/allergyInteractionService', () => ({
  checkAllergyInteractions: jest.fn(),
}));

const request = require('supertest');
const User = require('../../models/User');
const ClinicalRecord = require('../../models/ClinicalRecord');
const ConsentRule = require('../../models/ConsentRule');
const { app } = require('../../server');
const { resolveDrugName } = require('../../services/drugResolverService');
const { checkPair } = require('../../services/interactionCheckerService');
const { checkAllergyInteractions } = require('../../services/allergyInteractionService');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { buildClinicalRecord } = require('../helpers/clinicalRecordFactory');
const { buildActiveConsent } = require('../helpers/consentFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');
const { hashPassword, issueAuthTokens } = require('../../services/authService');

const buildFutureActiveConsent = (overrides = {}) => {
  const grantedAt = new Date('2026-06-01T10:00:00.000Z');
  const expiresAt = new Date('2026-08-01T10:00:00.000Z');
  return buildActiveConsent({ grantedAt, expiresAt, ...overrides });
};

describe('prescriptions lifecycle routes', () => {
  let physician;
  let patient;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
    jest.clearAllMocks();

    physician = await User.create(
      buildPhysician({ userId: 'physician-rx-life-001', accountStatus: 'ACTIVE' }),
    );
    patient = await User.create(
      buildPatient({ userId: 'patient-rx-life-001', accountStatus: 'ACTIVE' }),
    );

    await ConsentRule.create(
      buildFutureActiveConsent({
        consentId: 'consent-rx-life-001',
        patientId: patient._id,
        providerId: physician._id,
        allowedDomains: ['CARDIOLOGY'],
      }),
    );

    await ClinicalRecord.create(
      buildClinicalRecord({
        patientId: patient._id,
        recordId: 'rec-rx-life-001',
        domain: 'CARDIOLOGY',
        medications: { activeList: [], discontinuedList: [] },
        allergies: [],
      }),
    );

    resolveDrugName.mockResolvedValue({
      rxcui: '1191',
      name: 'Aspirin',
      source: 'RXCHECK',
    });

    checkPair.mockResolvedValue({
      tier: 'SAFE',
      drug1RxnormCui: '1191',
      drug2RxnormCui: '1191',
      source: 'RXCHECK',
      cached: false,
    });

    checkAllergyInteractions.mockResolvedValue({
      hasAllergyContraindication: false,
      matchedAllergens: [],
      decision: 'SAFE',
      openFda: null,
    });
  });

  it('GET /api/prescriptions/patient/:patientId lists active prescriptions', async () => {
    await ClinicalRecord.updateOne(
      { recordId: 'rec-rx-life-001' },
      {
        $set: {
          'medications.activeList': [
            {
              rxnormCui: '11289',
              drugName: 'warfarin',
              prescribedBy: physician._id,
              prescribedAt: new Date('2026-01-10T10:00:00.000Z'),
            },
          ],
        },
      },
    );

    const { accessToken } = await issueAuthTokens(physician);

    const response = await request(app)
      .get(`/api/prescriptions/patient/${patient._id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.prescriptions).toHaveLength(1);
    expect(response.body.prescriptions[0].drugName).toBe('warfarin');
    expect(response.body.prescriptions[0].prescribedBy.displayName).toContain('Smith');
  });

  it('GET /api/prescriptions/mine returns patient own prescriptions', async () => {
    await ClinicalRecord.updateOne(
      { recordId: 'rec-rx-life-001' },
      {
        $set: {
          'medications.activeList': [
            {
              rxnormCui: '1191',
              drugName: 'Aspirin',
              prescribedBy: physician._id,
              prescribedAt: new Date('2026-02-01T10:00:00.000Z'),
            },
          ],
        },
      },
    );

    const hashedPassword = await hashPassword('Password123!');
    const patientUser = await User.findById(patient._id);
    patientUser.credentials = { hashedPassword };
    await patientUser.save();

    const { accessToken } = await issueAuthTokens(patientUser);

    const response = await request(app)
      .get('/api/prescriptions/mine')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.prescriptions).toHaveLength(1);
    expect(response.body.prescriptions[0].drugName).toBe('Aspirin');
  });

  it('POST /api/prescriptions/commit adds medication after SAFE validation', async () => {
    const { accessToken } = await issueAuthTokens(physician);

    const validateResponse = await request(app)
      .post('/api/prescriptions/validate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        patientId: patient._id.toString(),
        newDrugName: 'Aspirin',
        dose: { value: 81, unit: 'mg', route: 'ORAL', frequency: 'daily' },
      });

    expect(validateResponse.status).toBe(200);

    const commitResponse = await request(app)
      .post('/api/prescriptions/commit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        validationEventId: validateResponse.body.validationEventId,
        patientId: patient._id.toString(),
      });

    expect(commitResponse.status).toBe(201);
    expect(commitResponse.body.prescription.drugName).toBe('Aspirin');

    const record = await ClinicalRecord.findOne({ recordId: 'rec-rx-life-001' }).lean();
    expect(record.medications.activeList).toHaveLength(1);
    expect(record.medications.activeList[0].rxnormCui).toBe('1191');
    expect(record.medications.activeList[0].prescribedBy.toString()).toBe(physician._id.toString());
  });

  it('bootstraps clinical record and prescribes when patient has no records', async () => {
    await ClinicalRecord.deleteMany({ patientId: patient._id });

    const { accessToken } = await issueAuthTokens(physician);

    const validateResponse = await request(app)
      .post('/api/prescriptions/validate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        patientId: patient._id.toString(),
        newDrugName: 'Aspirin',
        newDrugRxnormCui: '1191',
        dose: { value: 81, unit: 'mg', route: 'ORAL', frequency: 'daily' },
      });

    expect(validateResponse.status).toBe(200);
    expect(validateResponse.body.decision).toBe('SAFE');

    const commitResponse = await request(app)
      .post('/api/prescriptions/commit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        validationEventId: validateResponse.body.validationEventId,
        patientId: patient._id.toString(),
      });

    expect(commitResponse.status).toBe(201);

    const records = await ClinicalRecord.find({ patientId: patient._id }).lean();
    expect(records).toHaveLength(1);
    expect(records[0].domain).toBe('CARDIOLOGY');
    expect(records[0].medications.activeList).toHaveLength(1);

    const hashedPassword = await hashPassword('Password123!');
    const patientUser = await User.findById(patient._id);
    patientUser.credentials = { hashedPassword };
    await patientUser.save();

    const patientToken = (await issueAuthTokens(patientUser)).accessToken;
    const mineResponse = await request(app)
      .get('/api/prescriptions/mine')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(mineResponse.status).toBe(200);
    expect(mineResponse.body.prescriptions).toHaveLength(1);
    expect(mineResponse.body.prescriptions[0].drugName).toBe('Aspirin');
  });

  it('detects cross-doctor interaction against another prescriber active medication', async () => {
    const physicianA = physician;
    const physicianB = await User.create(
      buildPhysician({
        userId: 'physician-rx-life-b',
        accountStatus: 'ACTIVE',
        demographics: {
          legalName: { first: 'Alice', last: 'Jones' },
          dateOfBirth: new Date('1980-01-01'),
          biologicalSex: 'F',
          contactInfo: { email: 'alice.jones@hospital.org', preferredContactMethod: 'EMAIL' },
        },
      }),
    );

    await ConsentRule.create(
      buildFutureActiveConsent({
        consentId: 'consent-rx-life-b',
        patientId: patient._id,
        providerId: physicianB._id,
        allowedDomains: ['CARDIOLOGY'],
      }),
    );

    await ClinicalRecord.updateOne(
      { recordId: 'rec-rx-life-001' },
      {
        $set: {
          'medications.activeList': [
            {
              rxnormCui: '11289',
              drugName: 'warfarin',
              prescribedBy: physicianA._id,
              prescribedAt: new Date('2026-01-10T10:00:00.000Z'),
            },
          ],
        },
      },
    );

    checkPair.mockResolvedValue({
      tier: 'HARD_STOP',
      drug1RxnormCui: '11289',
      drug2RxnormCui: '1191',
      mechanismDescription: 'Increased bleeding risk',
      clinicalConsequence: 'Monitor INR closely',
      evidenceLevel: 'MAJOR',
      oncHighPriority: true,
      source: 'RXCHECK',
      cached: false,
    });

    const { accessToken } = await issueAuthTokens(physicianB);

    const response = await request(app)
      .post('/api/prescriptions/validate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        patientId: patient._id.toString(),
        newDrugName: 'Aspirin',
        newDrugRxnormCui: '1191',
      });

    expect(response.status).toBe(200);
    expect(response.body.decision).toBe('HARD_STOP');
    expect(response.body.interactions).toHaveLength(1);
    expect(response.body.interactions[0].activeDrugName).toBe('warfarin');
    expect(response.body.interactions[0].prescribedByName).toContain('Smith');
    expect(response.body.interactions[0].prescribedByPhysicianId).toBe(physicianA._id.toString());
  });

  it('POST /api/prescriptions/discontinue removes own prescription', async () => {
    await ClinicalRecord.updateOne(
      { recordId: 'rec-rx-life-001' },
      {
        $set: {
          'medications.activeList': [
            {
              rxnormCui: '1191',
              drugName: 'Aspirin',
              prescribedBy: physician._id,
              prescribedAt: new Date('2026-02-01T10:00:00.000Z'),
            },
          ],
          'medications.discontinuedList': [],
        },
      },
    );

    const { accessToken } = await issueAuthTokens(physician);

    const response = await request(app)
      .post('/api/prescriptions/discontinue')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        patientId: patient._id.toString(),
        recordId: 'rec-rx-life-001',
        rxnormCui: '1191',
        discontinuedReason: 'Therapy complete',
      });

    expect(response.status).toBe(200);

    const record = await ClinicalRecord.findOne({ recordId: 'rec-rx-life-001' }).lean();
    expect(record.medications.activeList).toHaveLength(0);
    expect(record.medications.discontinuedList).toHaveLength(1);
  });

  it('POST /api/prescriptions/discontinue returns 403 for non-prescriber', async () => {
    const otherPhysician = await User.create(
      buildPhysician({ userId: 'physician-rx-life-002', accountStatus: 'ACTIVE' }),
    );

    await ConsentRule.create(
      buildFutureActiveConsent({
        consentId: 'consent-rx-life-002',
        patientId: patient._id,
        providerId: otherPhysician._id,
        allowedDomains: ['CARDIOLOGY'],
      }),
    );

    await ClinicalRecord.updateOne(
      { recordId: 'rec-rx-life-001' },
      {
        $set: {
          'medications.activeList': [
            {
              rxnormCui: '1191',
              drugName: 'Aspirin',
              prescribedBy: physician._id,
              prescribedAt: new Date('2026-02-01T10:00:00.000Z'),
            },
          ],
        },
      },
    );

    const { accessToken } = await issueAuthTokens(otherPhysician);

    const response = await request(app)
      .post('/api/prescriptions/discontinue')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        patientId: patient._id.toString(),
        recordId: 'rec-rx-life-001',
        rxnormCui: '1191',
      });

    expect(response.status).toBe(403);
  });
});
