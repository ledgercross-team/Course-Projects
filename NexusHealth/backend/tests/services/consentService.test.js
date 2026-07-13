const User = require('../../models/User');
const ConsentRule = require('../../models/ConsentRule');
const AuditLog = require('../../models/AuditLog');
const { createConsentDraft, confirmConsent } = require('../../services/consentService');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('consentService', () => {
  let patient;
  let physician;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    patient = await User.create(buildPatient({ userId: 'patient-consent-001' }));
    physician = await User.create(buildPhysician({ userId: 'physician-consent-001' }));
  });

  it('creates a pending consent draft with audit trail entry', async () => {
    const consent = await createConsentDraft({
      patientMongoId: patient._id,
      providerId: physician._id,
      permissionTier: 'VIEW_ONLY',
      allowedDomains: ['CARDIOLOGY'],
      excludedDomains: ['PSYCHIATRY'],
      episodeId: 'referral-episode-88',
      durationDays: 90,
    });

    expect(consent.status).toBe('PENDING_PATIENT_CONFIRMATION');
    expect(consent.proposedDurationDays).toBe(90);
    expect(consent.stateChangeLog).toHaveLength(1);

    const auditEntry = await AuditLog.findOne({
      targetResourceId: consent.consentId,
      eventType: 'CONSENT_CREATED',
    });

    expect(auditEntry).not.toBeNull();
    expect(auditEntry.actorId.toString()).toBe(patient._id.toString());
  });

  it('activates consent only after explicit patient confirmation', async () => {
    const draft = await createConsentDraft({
      patientMongoId: patient._id,
      providerId: physician._id,
      permissionTier: 'VIEW_ONLY',
      allowedDomains: ['CARDIOLOGY'],
      excludedDomains: ['PSYCHIATRY'],
      episodeId: 'referral-episode-88',
      durationDays: 30,
    });

    const active = await confirmConsent({
      consentId: draft.consentId,
      patientMongoId: patient._id,
      confirmedViaMethod: 'PORTAL_2FA',
    });

    expect(active.status).toBe('ACTIVE');
    expect(active.grantedAt).toBeInstanceOf(Date);
    expect(active.expiresAt.getTime()).toBeGreaterThan(active.grantedAt.getTime());
    expect(active.patientConfirmation.confirmingIdentityHash).toMatch(/^[a-f0-9]{64}$/);

    const confirmAudit = await AuditLog.findOne({
      targetResourceId: draft.consentId,
      eventType: 'CONSENT_CONFIRMED',
    });

    expect(confirmAudit).not.toBeNull();
  });

  it('rejects confirmation from a different patient', async () => {
    const otherPatient = await User.create(buildPatient({ userId: 'patient-consent-002', patientProfile: { mrn: 'MRN-10002', bloodType: 'A+' } }));

    const draft = await createConsentDraft({
      patientMongoId: patient._id,
      providerId: physician._id,
      permissionTier: 'VIEW_ONLY',
      allowedDomains: ['CARDIOLOGY'],
      excludedDomains: ['PSYCHIATRY'],
      episodeId: 'referral-episode-88',
    });

    await expect(
      confirmConsent({
        consentId: draft.consentId,
        patientMongoId: otherPatient._id,
        confirmedViaMethod: 'PORTAL_2FA',
      })
    ).rejects.toMatchObject({
      message: 'Only the consenting patient may confirm this consent',
      statusCode: 403,
    });

    const unchanged = await ConsentRule.findById(draft._id);
    expect(unchanged.status).toBe('PENDING_PATIENT_CONFIRMATION');
  });

  it('rejects consent drafts with overlapping clinical domains', async () => {
    await expect(
      createConsentDraft({
        patientMongoId: patient._id,
        providerId: physician._id,
        permissionTier: 'VIEW_ONLY',
        allowedDomains: ['CARDIOLOGY', 'PSYCHIATRY'],
        excludedDomains: ['PSYCHIATRY'],
        episodeId: 'referral-episode-88',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});
