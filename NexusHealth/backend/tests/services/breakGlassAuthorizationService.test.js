// backend/tests/services/breakGlassAuthorizationService.test.js
const User = require('../../models/User');
const ConsentRule = require('../../models/ConsentRule');
const ClinicalRecord = require('../../models/ClinicalRecord');
const BreakGlassAuditLog = require('../../models/BreakGlassAuditLog');
const { checkAccessPermission } = require('../../services/breakGlassAuthorizationService');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { buildActiveConsent } = require('../helpers/consentFactory');
const { buildClinicalRecord } = require('../helpers/clinicalRecordFactory');
const { buildTier1BreakGlass } = require('../helpers/breakGlassFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('breakGlassAuthorizationService.checkAccessPermission', () => {
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

    patient = await User.create(buildPatient({ userId: 'patient-bg-auth-001' }));
    physician = await User.create(buildPhysician({ userId: 'physician-bg-auth-001' }));
  });

  it('allows access when active consent permits the requested domain', async () => {
    await ConsentRule.create(
      buildActiveConsent({
        patientId: patient._id,
        providerId: physician._id,
        allowedDomains: ['CARDIOLOGY', 'GENERAL_PRACTICE'],
        excludedDomains: ['PSYCHIATRY'],
        grantedAt: new Date('2026-06-01T10:00:00.000Z'),
        expiresAt: new Date('2026-08-01T10:00:00.000Z'),
      }),
    );

    const result = await checkAccessPermission(
      physician._id,
      patient._id,
      'CARDIOLOGY',
      { asOf: new Date('2026-06-14T12:00:00.000Z') },
    );

    expect(result.allowed).toBe(true);
    expect(result.source).toBe('CONSENT');
    expect(result.consent).not.toBeNull();
    expect(result.breakGlassEligible).toBe(true);
    expect(result.requiredTier).toBe('TIER_1_SOFT_OVERRIDE');
  });

  it('denies access when domain is excluded and marks physician break-glass eligible', async () => {
    await ConsentRule.create(
      buildActiveConsent({
        patientId: patient._id,
        providerId: physician._id,
        allowedDomains: ['CARDIOLOGY'],
        excludedDomains: ['PSYCHIATRY'],
        grantedAt: new Date('2026-06-01T10:00:00.000Z'),
        expiresAt: new Date('2026-08-01T10:00:00.000Z'),
      }),
    );

    const result = await checkAccessPermission(
      physician._id,
      patient._id,
      'PSYCHIATRY',
      { asOf: new Date('2026-06-14T12:00:00.000Z') },
    );

    expect(result.allowed).toBe(false);
    expect(result.source).toBeNull();
    expect(result.breakGlassEligible).toBe(true);
    expect(result.requiredTier).toBe('TIER_1_SOFT_OVERRIDE');
    expect(result.reason).toMatch(/does not permit access/i);
  });

  it('denies expired consent and allows break-glass eligibility for physicians', async () => {
    await ConsentRule.create(
      buildActiveConsent({
        patientId: patient._id,
        providerId: physician._id,
        allowedDomains: ['CARDIOLOGY'],
        grantedAt: new Date('2025-01-01T00:00:00.000Z'),
        expiresAt: new Date('2025-02-01T00:00:00.000Z'),
      }),
    );

    const result = await checkAccessPermission(
      physician._id,
      patient._id,
      'CARDIOLOGY',
      { asOf: new Date('2026-06-14T12:00:00.000Z') },
    );

    expect(result.allowed).toBe(false);
    expect(result.breakGlassEligible).toBe(true);
    expect(result.reason).toMatch(/No active/i);
  });

  it('allows access via active Tier 1 override regardless of consent domain', async () => {
    await ConsentRule.create(
      buildActiveConsent({
        patientId: patient._id,
        providerId: physician._id,
        allowedDomains: ['CARDIOLOGY'],
        excludedDomains: ['PSYCHIATRY'],
        grantedAt: new Date('2026-06-01T10:00:00.000Z'),
        expiresAt: new Date('2026-08-01T10:00:00.000Z'),
      }),
    );

    const eventCreatedAt = new Date('2026-06-14T10:00:00.000Z');
    await BreakGlassAuditLog.create(
      buildTier1BreakGlass({
        eventId: 'breakglass-auth-tier1-001',
        initiatedBy: physician._id,
        targetPatientId: patient._id,
        eventCreatedAt,
      }),
    );

    const result = await checkAccessPermission(
      physician._id,
      patient._id,
      'PSYCHIATRY',
      { asOf: new Date('2026-06-14T11:00:00.000Z') },
    );

    expect(result.allowed).toBe(true);
    expect(result.source).toBe('BREAK_GLASS_TIER1');
    expect(result.breakGlassEventId).toBe('breakglass-auth-tier1-001');
  });

  it('requires Tier 2 break-glass for highly sensitive domain when consent fails', async () => {
    await ClinicalRecord.create(
      buildClinicalRecord({
        patientId: patient._id,
        domain: 'PSYCHIATRY',
        sensitivityClassification: 'HIGHLY_SENSITIVE',
      }),
    );

    const result = await checkAccessPermission(physician._id, patient._id, 'PSYCHIATRY');

    expect(result.allowed).toBe(false);
    expect(result.breakGlassEligible).toBe(true);
    expect(result.domainSensitivity).toBe('HIGHLY_SENSITIVE');
    expect(result.requiredTier).toBe('TIER_2_HARD_OVERRIDE');
  });
});
