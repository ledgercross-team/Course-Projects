const User = require('../../models/User');
const ConsentRule = require('../../models/ConsentRule');
const AuditLog = require('../../models/AuditLog');
const {
  createConsentDraft,
  confirmConsent,
  revokeConsent,
  requestRenewal,
  expireConsents,
} = require('../../services/consentService');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

const activateConsent = async (patient, physician, overrides = {}) => {
  const draft = await createConsentDraft({
    patientMongoId: patient._id,
    providerId: physician._id,
    permissionTier: 'VIEW_ONLY',
    allowedDomains: ['CARDIOLOGY'],
    excludedDomains: ['PSYCHIATRY'],
    episodeId: 'referral-episode-88',
    durationDays: 30,
    ...overrides,
  });

  return confirmConsent({
    consentId: draft.consentId,
    patientMongoId: patient._id,
    confirmedViaMethod: 'PORTAL_2FA',
  });
};

describe('consentService lifecycle', () => {
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

    patient = await User.create(buildPatient({ userId: 'patient-consent-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(buildPhysician({ userId: 'physician-consent-001', accountStatus: 'ACTIVE' }));
  });

  describe('revocation', () => {
    it('revokes active consent with audit trail', async () => {
      const active = await activateConsent(patient, physician);

      const revoked = await revokeConsent({
        consentId: active.consentId,
        patientMongoId: patient._id,
        revokedReason: 'Referral episode concluded',
      });

      expect(revoked.status).toBe('REVOKED');
      expect(revoked.revokedReason).toBe('Referral episode concluded');

      const auditEntry = await AuditLog.findOne({
        targetResourceId: active.consentId,
        eventType: 'CONSENT_REVOKED',
      });

      expect(auditEntry).not.toBeNull();
    });

    it('rejects revocation from a non-patient actor', async () => {
      const active = await activateConsent(patient, physician);

      await expect(
        revokeConsent({
          consentId: active.consentId,
          patientMongoId: physician._id,
          revokedReason: 'Unauthorized attempt',
        })
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('renewal', () => {
    it('creates a pending renewal version without passively extending access', async () => {
      const active = await activateConsent(patient, physician);
      const originalExpiresAt = active.expiresAt.getTime();

      const renewalDraft = await requestRenewal({
        consentId: active.consentId,
        patientMongoId: patient._id,
        durationDays: 60,
      });

      expect(renewalDraft.status).toBe('PENDING_PATIENT_CONFIRMATION');
      expect(renewalDraft.versionNumber).toBe(2);
      expect(renewalDraft.previousVersionId.toString()).toBe(active._id.toString());

      const unchangedActive = await ConsentRule.findById(active._id);
      expect(unchangedActive.status).toBe('ACTIVE');
      expect(unchangedActive.expiresAt.getTime()).toBe(originalExpiresAt);
      expect(unchangedActive.renewalRequested).toBe(true);
    });

    it('activates renewal only after explicit patient re-confirmation', async () => {
      const active = await activateConsent(patient, physician);

      const renewalDraft = await requestRenewal({
        consentId: active.consentId,
        patientMongoId: patient._id,
        durationDays: 45,
      });

      const renewed = await confirmConsent({
        consentId: renewalDraft.consentId,
        patientMongoId: patient._id,
        confirmedViaMethod: 'BIOMETRIC',
      });

      expect(renewed.status).toBe('ACTIVE');
      expect(renewed.versionNumber).toBe(2);

      const superseded = await ConsentRule.findById(active._id);
      expect(superseded.status).toBe('SUPERSEDED');

      const renewalAudit = await AuditLog.findOne({
        targetResourceId: active.consentId,
        eventType: 'CONSENT_RENEWED',
        'payload.versionNumber': 2,
      });

      expect(renewalAudit).not.toBeNull();
    });

    it('rejects duplicate renewal requests while one is pending', async () => {
      const active = await activateConsent(patient, physician);

      await requestRenewal({
        consentId: active.consentId,
        patientMongoId: patient._id,
      });

      await expect(
        requestRenewal({
          consentId: active.consentId,
          patientMongoId: patient._id,
        })
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('expiry', () => {
    it('expires active consents past their window and records dual-party notifications', async () => {
      const active = await activateConsent(patient, physician);

      await ConsentRule.findByIdAndUpdate(active._id, {
        grantedAt: new Date('2025-11-01T00:00:00.000Z'),
        expiresAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const results = await expireConsents({ asOf: new Date('2026-01-02T00:00:00.000Z') });

      expect(results).toHaveLength(1);
      expect(results[0].consent.status).toBe('EXPIRED');
      expect(results[0].notification.notifyParties).toEqual(
        expect.arrayContaining(['PATIENT', 'PROVIDER'])
      );
      expect(results[0].notification.patientId).toBe(patient._id.toString());
      expect(results[0].notification.providerId).toBe(physician._id.toString());

      const expiryAudit = await AuditLog.findOne({
        targetResourceId: active.consentId,
        eventType: 'CONSENT_EXPIRED',
      });

      expect(expiryAudit.payload.notification).toBeDefined();
    });

    it('allows renewal of an expired consent via re-confirmation', async () => {
      const active = await activateConsent(patient, physician);

      await ConsentRule.findByIdAndUpdate(active._id, {
        status: 'EXPIRED',
        grantedAt: new Date('2025-11-01T00:00:00.000Z'),
        expiresAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const renewalDraft = await requestRenewal({
        consentId: active.consentId,
        patientMongoId: patient._id,
        durationDays: 30,
      });

      expect(renewalDraft.versionNumber).toBe(2);

      const renewed = await confirmConsent({
        consentId: renewalDraft.consentId,
        patientMongoId: patient._id,
        confirmedViaMethod: 'SIGNED_FORM',
      });

      expect(renewed.status).toBe('ACTIVE');
    });
  });
});
