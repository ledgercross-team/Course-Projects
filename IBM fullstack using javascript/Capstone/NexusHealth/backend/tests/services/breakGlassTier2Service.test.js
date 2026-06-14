const User = require('../../models/User');
const AuditLog = require('../../models/AuditLog');
const {
  initiateTier2Request,
  listPendingComplianceQueue,
  approveTier2Request,
  denyTier2Request,
  getTier2RequestStatus,
} = require('../../services/breakGlassService');
const { getActiveTier2Override } = require('../../services/breakGlassScopeService');
const { buildPatient, buildPhysician, buildCmo } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('breakGlassService Tier 2 state machine', () => {
  let patient;
  let physician;
  let cmo;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();

    patient = await User.create(buildPatient({ userId: 'patient-tier2-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(
      buildPhysician({ userId: 'physician-tier2-001', accountStatus: 'ACTIVE' })
    );
    cmo = await User.create(buildCmo({ userId: 'cmo-tier2-001', accountStatus: 'ACTIVE' }));
  });

  it('creates a pending Tier 2 request without granting immediate access', async () => {
    const result = await initiateTier2Request({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
      freeTextReason: 'Suspected sepsis requiring unrestricted chart review',
    });

    expect(result.breakGlassLog.tier).toBe('TIER_2_HARD_OVERRIDE');
    expect(result.breakGlassLog.recordPhase).toBe('REQUEST');
    expect(result.reviewStatus).toBe('PENDING');
    expect(result.breakGlassLog.tier2Authorization?.authorizedByCmoId).toBeUndefined();

    const activeOverride = await getActiveTier2Override({
      patientId: patient._id,
      providerId: physician._id,
    });

    expect(activeOverride).toBeNull();

    const auditEntry = await AuditLog.findOne({
      targetResourceId: result.breakGlassLog.eventId,
      eventType: 'BREAK_GLASS_INITIATED',
    });

    expect(auditEntry.payload.notification.notifyParties).toEqual(
      expect.arrayContaining(['CMO', 'PATIENT'])
    );
  });

  it('lists pending requests in the CMO compliance queue', async () => {
    const { breakGlassLog } = await initiateTier2Request({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
      freeTextReason: 'Awaiting CMO review for emergency access',
    });

    const pending = await listPendingComplianceQueue();

    expect(pending).toHaveLength(1);
    expect(pending[0].eventId).toBe(breakGlassLog.eventId);
  });

  it('approves a Tier 2 request and grants a bounded access session', async () => {
    const { breakGlassLog } = await initiateTier2Request({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'UNCONSCIOUS_PATIENT',
      freeTextReason: 'Unresponsive patient in ICU',
    });

    const approval = await approveTier2Request({
      requestEventId: breakGlassLog.eventId,
      cmoMongoId: cmo._id,
    });

    expect(approval.reviewStatus).toBe('CLEARED');
    expect(approval.approvalLog.recordPhase).toBe('APPROVAL');
    expect(approval.approvalLog.tier2Authorization.authorizedByCmoId.toString()).toBe(
      cmo._id.toString()
    );
    expect(approval.sessionExpiresAt.getTime()).toBeGreaterThan(
      approval.approvalLog.tier2Authorization.authorizedAt.getTime()
    );

    const activeOverride = await getActiveTier2Override({
      patientId: patient._id,
      providerId: physician._id,
    });

    expect(activeOverride).not.toBeNull();
    expect(activeOverride.requestEventId).toBe(breakGlassLog.eventId);

    const pending = await listPendingComplianceQueue();
    expect(pending).toHaveLength(0);

    const auditEntry = await AuditLog.findOne({
      targetResourceId: breakGlassLog.eventId,
      eventType: 'BREAK_GLASS_APPROVED',
    });

    expect(auditEntry.payload.notification.notifyParties).toContain('PHYSICIAN');
  });

  it('denies a Tier 2 request and keeps access blocked', async () => {
    const { breakGlassLog } = await initiateTier2Request({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'TRANSFER_OF_CARE',
      freeTextReason: 'Insufficient emergency justification',
    });

    const denial = await denyTier2Request({
      requestEventId: breakGlassLog.eventId,
      cmoMongoId: cmo._id,
    });

    expect(denial.reviewStatus).toBe('FLAGGED_FOR_INVESTIGATION');
    expect(denial.denialLog.recordPhase).toBe('DENIAL');

    const activeOverride = await getActiveTier2Override({
      patientId: patient._id,
      providerId: physician._id,
    });

    expect(activeOverride).toBeNull();

    const auditEntry = await AuditLog.findOne({
      targetResourceId: breakGlassLog.eventId,
      eventType: 'BREAK_GLASS_DENIED',
    });

    expect(auditEntry).not.toBeNull();
  });

  it('rejects duplicate CMO resolution of the same request', async () => {
    const { breakGlassLog } = await initiateTier2Request({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
      freeTextReason: 'Duplicate resolution guard',
    });

    await approveTier2Request({
      requestEventId: breakGlassLog.eventId,
      cmoMongoId: cmo._id,
    });

    await expect(
      denyTier2Request({
        requestEventId: breakGlassLog.eventId,
        cmoMongoId: cmo._id,
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects Tier 2 approval from non-CMO roles', async () => {
    const { breakGlassLog } = await initiateTier2Request({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
      freeTextReason: 'Role guard test for non-CMO approval',
    });

    await expect(
      approveTier2Request({
        requestEventId: breakGlassLog.eventId,
        cmoMongoId: physician._id,
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns request status with resolution details', async () => {
    const { breakGlassLog } = await initiateTier2Request({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
      freeTextReason: 'Status polling test for Tier 2 request',
    });

    const pendingStatus = await getTier2RequestStatus(breakGlassLog.eventId);
    expect(pendingStatus.reviewStatus).toBe('PENDING');
    expect(pendingStatus.sessionExpiresAt).toBeNull();

    await approveTier2Request({
      requestEventId: breakGlassLog.eventId,
      cmoMongoId: cmo._id,
    });

    const approvedStatus = await getTier2RequestStatus(breakGlassLog.eventId);
    expect(approvedStatus.reviewStatus).toBe('CLEARED');
    expect(approvedStatus.sessionExpiresAt).toBeInstanceOf(Date);
  });
});
