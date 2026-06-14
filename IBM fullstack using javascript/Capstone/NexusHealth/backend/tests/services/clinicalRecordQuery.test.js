const mongoose = require('mongoose');
const User = require('../../models/User');
const ClinicalRecord = require('../../models/ClinicalRecord');
const { getActiveConsentForProvider } = require('../../services/consentScopeService');
const {
  listPatientRecords,
  getPatientRecordById,
  countScopedRecords,
} = require('../../services/clinicalRecordQueryService');
const {
  createConsentDraft,
  confirmConsent,
} = require('../../services/consentService');
const { buildConsentScopedMatch } = require('../../utils/consentScope');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { buildClinicalRecord } = require('../helpers/clinicalRecordFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

const activateCardiologyConsent = async (patient, physician) => {
  const draft = await createConsentDraft({
    patientMongoId: patient._id,
    providerId: physician._id,
    permissionTier: 'VIEW_ONLY',
    allowedDomains: ['CARDIOLOGY'],
    excludedDomains: ['PSYCHIATRY'],
    episodeId: 'referral-episode-88',
    durationDays: 90,
  });

  return confirmConsent({
    consentId: draft.consentId,
    patientMongoId: patient._id,
    confirmedViaMethod: 'PORTAL_2FA',
  });
};

describe('clinicalRecordQueryService', () => {
  let patient;
  let physician;
  let cardioRecord;
  let psychRecord;
  let otherEpisodeRecord;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    patient = await User.create(buildPatient({ userId: 'patient-records-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(buildPhysician({ userId: 'physician-records-001', accountStatus: 'ACTIVE' }));

    cardioRecord = await ClinicalRecord.create(
      buildClinicalRecord({
        recordId: 'rec-cardio-001',
        patientId: patient._id,
        domain: 'CARDIOLOGY',
        episodeId: 'referral-episode-88',
      })
    );

    psychRecord = await ClinicalRecord.create(
      buildClinicalRecord({
        recordId: 'rec-psych-001',
        patientId: patient._id,
        domain: 'PSYCHIATRY',
        episodeId: 'referral-episode-88',
        clinicalNote: { assessmentText: 'Restricted psychiatric note' },
      })
    );

    otherEpisodeRecord = await ClinicalRecord.create(
      buildClinicalRecord({
        recordId: 'rec-cardio-other-episode',
        patientId: patient._id,
        domain: 'CARDIOLOGY',
        episodeId: 'referral-episode-99',
      })
    );
  });

  it('returns only consent-allowed domains for a physician via aggregation pipeline', async () => {
    const consent = await activateCardiologyConsent(patient, physician);

    const records = await listPatientRecords({
      clinicalReadScope: {
        type: 'CONSENT',
        unrestricted: false,
        consent,
        matchFilter: buildConsentScopedMatch(consent, patient._id),
      },
      patientId: patient._id,
    });

    expect(records).toHaveLength(1);
    expect(records[0].recordId).toBe(cardioRecord.recordId);
    expect(records.map((record) => record.domain)).not.toContain('PSYCHIATRY');
  });

  it('excludes psychiatric records even when they share the referral episode', async () => {
    const consent = await activateCardiologyConsent(patient, physician);

    const scopedCount = await countScopedRecords({
      clinicalReadScope: {
        type: 'CONSENT',
        unrestricted: false,
        consent,
        matchFilter: buildConsentScopedMatch(consent, patient._id),
      },
      patientId: patient._id,
    });

    expect(scopedCount).toBe(1);

    const blocked = await getPatientRecordById({
      clinicalReadScope: {
        type: 'CONSENT',
        unrestricted: false,
        consent,
        matchFilter: buildConsentScopedMatch(consent, patient._id),
      },
      patientId: patient._id,
      recordId: psychRecord.recordId,
    });

    expect(blocked).toBeNull();
  });

  it('filters by episodeId tied to the active consent', async () => {
    const consent = await activateCardiologyConsent(patient, physician);

    const records = await listPatientRecords({
      clinicalReadScope: {
        type: 'CONSENT',
        unrestricted: false,
        consent,
        matchFilter: buildConsentScopedMatch(consent, patient._id),
      },
      patientId: patient._id,
    });

    expect(records.some((record) => record.recordId === otherEpisodeRecord.recordId)).toBe(false);
  });

  it('allows patients unrestricted access to all of their own records', async () => {
    const records = await listPatientRecords({
      clinicalReadScope: {
        type: 'SELF',
        unrestricted: true,
        patientId: patient._id,
      },
      patientId: patient._id,
    });

    expect(records).toHaveLength(3);
    expect(records.map((record) => record.domain)).toEqual(
      expect.arrayContaining(['CARDIOLOGY', 'PSYCHIATRY'])
    );
  });

  it('returns null for physicians without active consent', async () => {
    const consent = await getActiveConsentForProvider({
      patientId: patient._id,
      providerId: physician._id,
    });

    expect(consent).toBeNull();
  });

  it('blocks physician access when consent has expired', async () => {
    const consent = await activateCardiologyConsent(patient, physician);

    await mongoose.model('ConsentRule').findByIdAndUpdate(consent._id, {
      grantedAt: new Date('2025-11-01T00:00:00.000Z'),
      expiresAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const activeConsent = await getActiveConsentForProvider({
      patientId: patient._id,
      providerId: physician._id,
      asOf: new Date('2026-06-01T00:00:00.000Z'),
    });

    expect(activeConsent).toBeNull();
  });
});
