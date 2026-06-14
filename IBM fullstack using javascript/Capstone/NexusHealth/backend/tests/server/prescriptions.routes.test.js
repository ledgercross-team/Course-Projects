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
const AuditLog = require('../../models/AuditLog');
const { app } = require('../../server');
const { resolveDrugName } = require('../../services/drugResolverService');
const { checkPair } = require('../../services/interactionCheckerService');
const { checkAllergyInteractions } = require('../../services/allergyInteractionService');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { buildClinicalRecord } = require('../helpers/clinicalRecordFactory');
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

describe('prescriptions routes', () => {
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
      buildPhysician({ userId: 'physician-rx-001', accountStatus: 'ACTIVE' })
    );
    patient = await User.create(buildPatient({ userId: 'patient-rx-001', accountStatus: 'ACTIVE' }));

    await ConsentRule.create(
      buildFutureActiveConsent({
        consentId: 'consent-rx-001',
        patientId: patient._id,
        providerId: physician._id,
        allowedDomains: ['CARDIOLOGY'],
      })
    );

    await ClinicalRecord.create(
      buildClinicalRecord({
        patientId: patient._id,
        recordId: 'rec-rx-001',
        medications: {
          activeList: [
            {
              rxnormCui: '11289',
              drugName: 'warfarin',
              prescribedAt: new Date('2026-01-10T10:00:00.000Z'),
            },
          ],
          discontinuedList: [],
        },
        allergies: [],
      })
    );

    resolveDrugName.mockResolvedValue({
      rxcui: '1191',
      name: 'Aspirin',
      source: 'RXCHECK',
    });

    checkAllergyInteractions.mockResolvedValue({
      hasAllergyContraindication: false,
      matchedAllergens: [],
      decision: 'SAFE',
      openFda: null,
    });
  });

  it('POST /api/prescriptions/validate returns HARD_STOP with requiresAcknowledgement for override flow', async () => {
    checkPair.mockResolvedValue({
      tier: 'HARD_STOP',
      drug1RxnormCui: '11289',
      drug2RxnormCui: '1191',
      mechanismDescription: 'Increased bleeding risk',
      clinicalConsequence: 'Monitor INR closely',
      evidenceLevel: 'MAJOR',
      source: 'RXCHECK',
      cached: false,
      rxcheck: {
        severity: 'major',
        mechanism: 'Increased bleeding risk',
        clinical_consequence: 'Monitor INR closely',
        onc_high_priority: false,
      },
    });

    const response = await request(app)
      .post('/api/prescriptions/validate')
      .set('x-user-id', physician.userId)
      .send({
        patientId: patient._id.toString(),
        newDrugName: 'Aspirin',
      });

    expect(response.status).toBe(200);
    expect(response.body.decision).toBe('HARD_STOP');
    expect(response.body.blocked).toBe(false);
    expect(response.body.requiresAcknowledgement).toBe(true);
    expect(response.body.overrideType).toBe('DRUG_DRUG');
    expect(response.body.validationEventId).toMatch(/^val-/);
    expect(response.body.interactions).toHaveLength(1);
    expect(response.body.interactions[0].rxcheck?.severity).toBe('major');

    const auditEntry = await AuditLog.findOne({
      targetResourceId: response.body.validationEventId,
      eventType: 'PRESCRIPTION_VALIDATED',
    }).lean();

    expect(auditEntry).not.toBeNull();
    expect(auditEntry.payload.decision).toBe('HARD_STOP');
    expect(auditEntry.actorId.toString()).toBe(physician._id.toString());
  });

  it('POST /api/prescriptions/validate returns SAFE and writes audit when no interactions are found', async () => {
    checkPair.mockResolvedValue({
      tier: 'SAFE',
      drug1RxnormCui: '11289',
      drug2RxnormCui: '1191',
      source: 'RXCHECK',
      cached: false,
    });

    const response = await request(app)
      .post('/api/prescriptions/validate')
      .set('x-user-id', physician.userId)
      .send({
        patientId: patient._id.toString(),
        newDrugName: 'Aspirin',
      });

    expect(response.status).toBe(200);
    expect(response.body.decision).toBe('SAFE');
    expect(response.body.blocked).toBe(false);
    expect(response.body.interactions).toHaveLength(0);

    const auditEntry = await AuditLog.findOne({
      targetResourceId: response.body.validationEventId,
      eventType: 'PRESCRIPTION_VALIDATED',
    }).lean();

    expect(auditEntry).not.toBeNull();
    expect(auditEntry.payload.decision).toBe('SAFE');
  });

  it('allows physician to acknowledge a SOFT_WARNING validation and writes flag + audit', async () => {
    checkPair.mockResolvedValue({
      tier: 'SOFT_WARNING',
      drug1RxnormCui: '11289',
      drug2RxnormCui: '1191',
      mechanismDescription: 'Monitor closely',
      clinicalConsequence: 'Use caution',
      evidenceLevel: 'MODERATE',
      source: 'RXCHECK',
      cached: false,
    });

    const validateResponse = await request(app)
      .post('/api/prescriptions/validate')
      .set('x-user-id', physician.userId)
      .send({
        patientId: patient._id.toString(),
        newDrugName: 'Aspirin',
      });

    expect(validateResponse.status).toBe(200);
    expect(validateResponse.body.decision).toBe('SOFT_WARNING');
    expect(validateResponse.body.blocked).toBe(false);

    const ackResponse = await request(app)
      .post(`/api/prescriptions/${validateResponse.body.validationEventId}/acknowledge`)
      .set('x-user-id', physician.userId)
      .send({ acknowledgementJustification: 'Benefit outweighs interaction risk after review.' });

    expect(ackResponse.status).toBe(200);
    expect(ackResponse.body.validationEventId).toBe(validateResponse.body.validationEventId);
    expect(ackResponse.body.flagId).toMatch(/^flag-/);

    const record = await ClinicalRecord.findOne({ patientId: patient._id }).lean();
    expect(record.drugInteractionFlags).toHaveLength(1);
    expect(record.drugInteractionFlags[0].tier).toBe('SOFT_WARNING');
    expect(record.drugInteractionFlags[0].acknowledgementJustification).toBe(
      'Benefit outweighs interaction risk after review.'
    );

    const ackAudit = await AuditLog.findOne({
      targetResourceId: validateResponse.body.validationEventId,
      eventType: 'PRESCRIPTION_ACKNOWLEDGED',
    }).lean();

    expect(ackAudit).not.toBeNull();
  });

  it('returns 403 when a non-PHYSICIAN attempts validation', async () => {
    const response = await request(app)
      .post('/api/prescriptions/validate')
      .set('x-user-id', patient.userId)
      .send({
        patientId: patient._id.toString(),
        newDrugName: 'Aspirin',
      });

    expect(response.status).toBe(403);
    expect(resolveDrugName).not.toHaveBeenCalled();
  });

  it('returns 400 for invalid patientId', async () => {
    const response = await request(app)
      .post('/api/prescriptions/validate')
      .set('x-user-id', physician.userId)
      .send({
        patientId: 'not-a-valid-object-id',
        newDrugName: 'Aspirin',
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/patientId/i);
  });

  it('returns 403 when physician has no active consent for the patient', async () => {
    await ConsentRule.deleteMany({});

    const response = await request(app)
      .post('/api/prescriptions/validate')
      .set('x-user-id', physician.userId)
      .send({
        patientId: patient._id.toString(),
        newDrugName: 'Aspirin',
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/consent/i);
    expect(resolveDrugName).not.toHaveBeenCalled();
  });

  it('allows physician to acknowledge and commit a HARD_STOP validation', async () => {
    checkPair.mockResolvedValue({
      tier: 'HARD_STOP',
      drug1RxnormCui: '11289',
      drug2RxnormCui: '1191',
      mechanismDescription: 'Increased bleeding risk',
      source: 'RXCHECK',
      cached: false,
    });

    const validateResponse = await request(app)
      .post('/api/prescriptions/validate')
      .set('x-user-id', physician.userId)
      .send({
        patientId: patient._id.toString(),
        newDrugName: 'Aspirin',
      });

    const ackResponse = await request(app)
      .post(`/api/prescriptions/${validateResponse.body.validationEventId}/acknowledge`)
      .set('x-user-id', physician.userId)
      .send({ acknowledgementJustification: 'Clinical override after risk review.' });

    expect(ackResponse.status).toBe(200);

    const record = await ClinicalRecord.findOne({ patientId: patient._id }).lean();
    expect(record.drugInteractionFlags[0].tier).toBe('HARD_STOP');

    const commitResponse = await request(app)
      .post('/api/prescriptions/commit')
      .set('x-user-id', physician.userId)
      .send({
        validationEventId: validateResponse.body.validationEventId,
        patientId: patient._id.toString(),
      });

    expect(commitResponse.status).toBe(201);
  });

  it('returns 409 when committing HARD_STOP without acknowledgement', async () => {
    checkPair.mockResolvedValue({
      tier: 'HARD_STOP',
      drug1RxnormCui: '11289',
      drug2RxnormCui: '1191',
      mechanismDescription: 'Increased bleeding risk',
      source: 'RXCHECK',
      cached: false,
    });

    const validateResponse = await request(app)
      .post('/api/prescriptions/validate')
      .set('x-user-id', physician.userId)
      .send({
        patientId: patient._id.toString(),
        newDrugName: 'Aspirin',
      });

    const commitResponse = await request(app)
      .post('/api/prescriptions/commit')
      .set('x-user-id', physician.userId)
      .send({
        validationEventId: validateResponse.body.validationEventId,
        patientId: patient._id.toString(),
      });

    expect(commitResponse.status).toBe(409);
    expect(commitResponse.body.error).toMatch(/acknowledged/i);
  });

  it('validates and commits multiple medications with shared prescription note', async () => {
    checkPair.mockResolvedValue({
      tier: 'SAFE',
      drug1RxnormCui: '11289',
      drug2RxnormCui: '1191',
      source: 'RXCHECK',
      cached: false,
    });

    const validateResponse = await request(app)
      .post('/api/prescriptions/validate')
      .set('x-user-id', physician.userId)
      .send({
        patientId: patient._id.toString(),
        prescriptionNote: 'Follow up in 2 weeks for blood work.',
        medications: [
          {
            newDrugName: 'Aspirin',
            newDrugRxnormCui: '1191',
            dose: { value: 81, unit: 'mg', route: 'ORAL', frequency: 'daily' },
          },
          {
            newDrugName: 'Lisinopril',
            newDrugRxnormCui: '29046',
            dose: { value: 10, unit: 'mg', route: 'ORAL', frequency: 'daily' },
          },
        ],
      });

    expect(validateResponse.status).toBe(200);
    expect(validateResponse.body.decision).toBe('SAFE');
    expect(validateResponse.body.medications).toHaveLength(2);
    expect(validateResponse.body.prescriptionNote).toBe('Follow up in 2 weeks for blood work.');

    const commitResponse = await request(app)
      .post('/api/prescriptions/commit')
      .set('x-user-id', physician.userId)
      .send({
        validationEventId: validateResponse.body.validationEventId,
        patientId: patient._id.toString(),
      });

    expect(commitResponse.status).toBe(201);
    expect(commitResponse.body.prescription.prescriptions).toHaveLength(2);

    const record = await ClinicalRecord.findOne({ patientId: patient._id }).lean();
    expect(record.medications.activeList).toHaveLength(3);
    const aspirin = record.medications.activeList.find((med) => med.rxnormCui === '1191');
    const lisinopril = record.medications.activeList.find((med) => med.rxnormCui === '29046');
    expect(aspirin.instructions).toBe('Follow up in 2 weeks for blood work.');
    expect(lisinopril.instructions).toBe('Follow up in 2 weeks for blood work.');
  });

  it('detects interaction between two medications in the same batch order', async () => {
    checkPair.mockImplementation(async (drug1, drug2) => {
      const pair = [drug1, drug2].sort().join('-');
      if (pair === '1191-29046') {
        return {
          tier: 'SOFT_WARNING',
          drug1RxnormCui: drug1,
          drug2RxnormCui: drug2,
          mechanismDescription: 'Additive hypotension risk',
          source: 'RXCHECK',
          cached: false,
        };
      }

      return {
        tier: 'SAFE',
        drug1RxnormCui: drug1,
        drug2RxnormCui: drug2,
        source: 'RXCHECK',
        cached: false,
      };
    });

    const validateResponse = await request(app)
      .post('/api/prescriptions/validate')
      .set('x-user-id', physician.userId)
      .send({
        patientId: patient._id.toString(),
        medications: [
          {
            newDrugName: 'Aspirin',
            newDrugRxnormCui: '1191',
            dose: { value: 81, unit: 'mg', route: 'ORAL', frequency: 'daily' },
          },
          {
            newDrugName: 'Lisinopril',
            newDrugRxnormCui: '29046',
            dose: { value: 10, unit: 'mg', route: 'ORAL', frequency: 'daily' },
          },
        ],
      });

    expect(validateResponse.status).toBe(200);
    expect(validateResponse.body.decision).toBe('SOFT_WARNING');
    expect(validateResponse.body.interactions).toHaveLength(1);
    expect(validateResponse.body.interactions[0].activeDrugName).toBe('Aspirin');
    expect(validateResponse.body.interactions[0].newDrugName).toBe('Lisinopril');
  });
});
