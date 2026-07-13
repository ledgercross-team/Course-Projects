jest.mock('../../services/interactionCheckerService', () => ({
  checkPair: jest.fn(),
}));

const request = require('supertest');
const User = require('../../models/User');
const ClinicalRecord = require('../../models/ClinicalRecord');
const ConsentRule = require('../../models/ConsentRule');
const { app } = require('../../server');
const { checkPair } = require('../../services/interactionCheckerService');
const { buildPatient, buildPhysician, buildCmo } = require('../helpers/userFactory');
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

describe('polypharmacy routes', () => {
  let physician;
  let cmo;
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
      buildPhysician({ userId: 'physician-poly-001', accountStatus: 'ACTIVE' })
    );
    cmo = await User.create(buildCmo({ userId: 'cmo-poly-001', accountStatus: 'ACTIVE' }));
    patient = await User.create(buildPatient({ userId: 'patient-poly-001', accountStatus: 'ACTIVE' }));

    await ConsentRule.create(
      buildFutureActiveConsent({
        consentId: 'consent-poly-physician',
        patientId: patient._id,
        providerId: physician._id,
        allowedDomains: ['CARDIOLOGY'],
      })
    );

    await ConsentRule.create(
      buildFutureActiveConsent({
        consentId: 'consent-poly-cmo',
        patientId: patient._id,
        providerId: cmo._id,
        allowedDomains: ['GENERAL_PRACTICE'],
      })
    );
  });

  it('returns LOW risk when active medication list is empty', async () => {
    await ClinicalRecord.create(
      buildClinicalRecord({
        patientId: patient._id,
        recordId: 'rec-poly-empty',
        medications: { activeList: [], discontinuedList: [] },
      })
    );

    const response = await request(app)
      .get(`/api/prescriptions/polypharmacy-check/${patient._id}`)
      .set('x-user-id', physician.userId);

    expect(response.status).toBe(200);
    expect(response.body.riskLevel).toBe('LOW');
    expect(response.body.flaggedPairs).toEqual([]);
    expect(checkPair).not.toHaveBeenCalled();
  });

  it('returns LOW risk when only one active drug is present', async () => {
    await ClinicalRecord.create(
      buildClinicalRecord({
        patientId: patient._id,
        recordId: 'rec-poly-single',
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
      })
    );

    const response = await request(app)
      .get(`/api/prescriptions/polypharmacy-check/${patient._id}`)
      .set('x-user-id', physician.userId);

    expect(response.status).toBe(200);
    expect(response.body.riskLevel).toBe('LOW');
    expect(response.body.flaggedPairs).toEqual([]);
    expect(checkPair).not.toHaveBeenCalled();
  });

  it('returns HIGH risk when two active drugs have a HARD_STOP interaction', async () => {
    await ClinicalRecord.create(
      buildClinicalRecord({
        patientId: patient._id,
        recordId: 'rec-poly-pair',
        medications: {
          activeList: [
            {
              rxnormCui: '11289',
              drugName: 'warfarin',
              prescribedAt: new Date('2026-01-10T10:00:00.000Z'),
            },
            {
              rxnormCui: '1191',
              drugName: 'aspirin',
              prescribedAt: new Date('2026-01-11T10:00:00.000Z'),
            },
          ],
          discontinuedList: [],
        },
      })
    );

    checkPair.mockResolvedValue({
      tier: 'HARD_STOP',
      drug1RxnormCui: '11289',
      drug2RxnormCui: '1191',
      mechanismDescription: 'Increased bleeding risk',
      clinicalConsequence: 'Monitor INR closely',
      evidenceLevel: 'MAJOR',
      source: 'RXCHECK',
      cached: false,
    });

    const response = await request(app)
      .get(`/api/prescriptions/polypharmacy-check/${patient._id}`)
      .set('x-user-id', physician.userId);

    expect(response.status).toBe(200);
    expect(response.body.riskLevel).toBe('HIGH');
    expect(response.body.flaggedPairs).toHaveLength(1);
    expect(response.body.flaggedPairs[0].tier).toBe('HARD_STOP');
    expect(checkPair).toHaveBeenCalledWith('11289', '1191');
  });

  it('returns 403 when a patient attempts polypharmacy check', async () => {
    const response = await request(app)
      .get(`/api/prescriptions/polypharmacy-check/${patient._id}`)
      .set('x-user-id', patient.userId);

    expect(response.status).toBe(403);
    expect(checkPair).not.toHaveBeenCalled();
  });

  it('allows CMO with active consent to run polypharmacy check', async () => {
    await ClinicalRecord.create(
      buildClinicalRecord({
        patientId: patient._id,
        recordId: 'rec-poly-cmo',
        domain: 'GENERAL_PRACTICE',
        medications: { activeList: [], discontinuedList: [] },
      })
    );

    const response = await request(app)
      .get(`/api/prescriptions/polypharmacy-check/${patient._id}`)
      .set('x-user-id', cmo.userId);

    expect(response.status).toBe(200);
    expect(response.body.riskLevel).toBe('LOW');
  });
});
