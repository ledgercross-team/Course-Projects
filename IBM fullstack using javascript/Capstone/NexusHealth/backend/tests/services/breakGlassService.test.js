const User = require('../../models/User');
const AuditLog = require('../../models/AuditLog');
const BreakGlassAuditLog = require('../../models/BreakGlassAuditLog');
const ClinicalRecord = require('../../models/ClinicalRecord');
const {
  executeBreakGlassOverride,
  initiateTier1SoftOverride,
} = require('../../services/breakGlassService');
const { clearNotificationQueue, flushNotificationQueue } = require('../../services/breakGlassNotificationService');
const { getActiveTier1Override } = require('../../services/breakGlassScopeService');
const { BREAK_GLASS_TIER1_SESSION_HOURS } = require('../../config/enums');
const { buildAppendOnlyErrorMessage } = require('../../utils/appendOnlySchema');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { buildClinicalRecord } = require('../helpers/clinicalRecordFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

const APPEND_ONLY_ERROR = buildAppendOnlyErrorMessage('breakGlassAuditLogs');

describe('breakGlassService', () => {
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
    clearNotificationQueue();

    patient = await User.create(buildPatient({ userId: 'patient-bg-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(
      buildPhysician({ userId: 'physician-bg-001', accountStatus: 'ACTIVE' })
    );
  });

  it('creates an immutable Tier 1 log with compliance escalation and patient notification', async () => {
    const result = await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
      freeTextReason: 'Patient presenting with acute cardiac arrest',
      icdCodeContext: 'I46.9',
      notificationChannel: 'EMAIL',
    });

    expect(result.breakGlassLog.tier).toBe('TIER_1_SOFT_OVERRIDE');
    expect(result.breakGlassLog.complianceEscalation.reviewStatus).toBe('PENDING');
    expect(result.breakGlassLog.complianceEscalation.escalatedToQueueAt).toBeInstanceOf(Date);
    expect(result.breakGlassLog.patientNotification.notificationChannel).toBe('EMAIL');
    expect(result.breakGlassLog.signatureHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.sessionExpiresAt.getTime()).toBeGreaterThan(result.breakGlassLog.eventCreatedAt.getTime());
    expect(result.escalationDueBy.getTime()).toBeGreaterThan(result.breakGlassLog.eventCreatedAt.getTime());

    const auditEntry = await AuditLog.findOne({
      targetResourceId: result.breakGlassLog.eventId,
      eventType: 'BREAK_GLASS_INITIATED',
    });

    expect(auditEntry).not.toBeNull();
    expect(auditEntry.payload.notification.notifyParties).toContain('PATIENT');
  });

  it('uses patient preferred contact method when notification channel is omitted', async () => {
    await User.findByIdAndUpdate(patient._id, {
      demographics: {
        ...patient.demographics,
        contactInfo: {
          email: 'jane.doe@example.com',
          preferredContactMethod: 'SMS',
        },
      },
    });

    const result = await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
      freeTextReason: 'Patient presenting with acute cardiac arrest',
    });

    expect(result.breakGlassLog.patientNotification.notificationChannel).toBe('SMS');
  });

  it('queues an async patient notification after Tier 1 initiation', async () => {
    await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
      freeTextReason: 'Emergency department access without active consent',
    });

    const deliveries = await flushNotificationQueue();

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].job.notifyParties).toContain('PATIENT');
    expect(deliveries[0].job.channel).toBe('EMAIL');
  });

  it('sets reviewDueBy on Tier 1 compliance escalation for sensitive domains', async () => {
    await ClinicalRecord.create(
      buildClinicalRecord({
        patientId: patient._id,
        domain: 'PSYCHIATRY',
        sensitivityClassification: 'HIGHLY_SENSITIVE',
      }),
    );

    const result = await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'UNCONSCIOUS_PATIENT',
      freeTextReason: 'Psychiatric emergency requiring immediate chart access',
      affectedDomains: ['PSYCHIATRY'],
    });

    expect(result.breakGlassLog.complianceEscalation.reviewDueBy).toBeInstanceOf(Date);
    expect(result.breakGlassLog.complianceEscalation.reviewDueBy.getTime()).toBeGreaterThan(
      result.breakGlassLog.eventCreatedAt.getTime(),
    );
  });

  it('rejects Tier 1 initiation from non-physician roles', async () => {
    const cmo = await User.create(
      buildPhysician({
        userId: 'cmo-bg-001',
        role: 'CMO',
        accountStatus: 'ACTIVE',
        physicianProfile: {
          licenseNumber: 'MD-67890',
          npiNumber: '0987654321',
          specializations: ['GENERAL_PRACTICE'],
          isCMO: true,
        },
      })
    );

    await expect(
      initiateTier1SoftOverride({
        physicianMongoId: cmo._id,
        targetPatientId: patient._id,
        clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
        freeTextReason: 'Attempted override by CMO role',
      })
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('rejects invalid clinical justification codes', async () => {
    await expect(
      initiateTier1SoftOverride({
        physicianMongoId: physician._id,
        targetPatientId: patient._id,
        clinicalJustificationCode: 'INVALID_CODE',
        freeTextReason: 'Emergency access for invalid code test',
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('blocks mutation of persisted break-glass logs', async () => {
    const { breakGlassLog } = await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'UNCONSCIOUS_PATIENT',
      freeTextReason: 'Unresponsive in trauma bay',
    });

    const persisted = await BreakGlassAuditLog.findById(breakGlassLog._id);
    persisted.justification.freeTextReason = 'tampered';

    await expect(persisted.save()).rejects.toThrow(APPEND_ONLY_ERROR);
  });

  it('exposes an active Tier 1 override for emergency reads', async () => {
    await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'TRANSFER_OF_CARE',
      freeTextReason: 'Emergency transfer from outside hospital',
    });

    const activeOverride = await getActiveTier1Override({
      patientId: patient._id,
      providerId: physician._id,
    });

    expect(activeOverride).not.toBeNull();
    expect(activeOverride.tier).toBe('TIER_1_SOFT_OVERRIDE');
  });

  it('rejects invalid targetPatientId values', async () => {
    await expect(
      initiateTier1SoftOverride({
        physicianMongoId: physician._id,
        targetPatientId: 'not-a-valid-object-id',
        clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
        freeTextReason: 'Emergency access for invalid code test',
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('does not expose expired Tier 1 overrides', async () => {
    await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'UNCONSCIOUS_PATIENT',
      freeTextReason: 'Expired override test',
    });

    const expiredAsOf = new Date(
      Date.now() + (BREAK_GLASS_TIER1_SESSION_HOURS + 1) * 60 * 60 * 1000
    );

    const activeOverride = await getActiveTier1Override({
      patientId: patient._id,
      providerId: physician._id,
      asOf: expiredAsOf,
    });

    expect(activeOverride).toBeNull();
  });

  it('blocks scope when Tier 1 override is flagged for investigation', async () => {
    const { breakGlassLog } = await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
      freeTextReason: 'Flagged override test',
    });

    await BreakGlassAuditLog.collection.drop();
    await BreakGlassAuditLog.create({
      ...breakGlassLog.toObject(),
      _id: undefined,
      complianceEscalation: {
        ...breakGlassLog.complianceEscalation,
        reviewStatus: 'FLAGGED_FOR_INVESTIGATION',
      },
    });

    const activeOverride = await getActiveTier1Override({
      patientId: patient._id,
      providerId: physician._id,
    });

    expect(activeOverride).toBeNull();
  });
});

describe('executeBreakGlassOverride', () => {
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
    clearNotificationQueue();

    patient = await User.create(buildPatient({ userId: 'patient-bg-exec-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(
      buildPhysician({ userId: 'physician-bg-exec-001', accountStatus: 'ACTIVE' }),
    );
  });

  it('rejects freeTextReason shorter than 20 characters', async () => {
    await expect(
      executeBreakGlassOverride({
        initiatedBy: physician._id,
        targetPatientId: patient._id,
        clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
        freeTextReason: 'Too short',
        affectedDomains: ['CARDIOLOGY'],
      }),
    ).rejects.toMatchObject({ statusCode: 400, name: 'IncompleteJustificationError' });
  });

  it('rejects initiation from non-physician roles', async () => {
    const cmo = await User.create(
      buildPhysician({
        userId: 'cmo-bg-exec-001',
        role: 'CMO',
        accountStatus: 'ACTIVE',
        physicianProfile: {
          licenseNumber: 'MD-67891',
          npiNumber: '0987654322',
          specializations: ['GENERAL_PRACTICE'],
          isCMO: true,
        },
      }),
    );

    await expect(
      executeBreakGlassOverride({
        initiatedBy: cmo._id,
        targetPatientId: patient._id,
        clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
        freeTextReason: 'CMO attempted break-glass override',
        affectedDomains: ['CARDIOLOGY'],
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it('creates Tier 1 override for standard-sensitivity domains', async () => {
    const result = await executeBreakGlassOverride({
      initiatedBy: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
      freeTextReason: 'Patient collapsed in waiting room without consent on file',
      affectedDomains: ['CARDIOLOGY'],
    });

    expect(result.tier).toBe('TIER_1_SOFT_OVERRIDE');
    expect(result.breakGlassLog.tier).toBe('TIER_1_SOFT_OVERRIDE');
    expect(result.sessionExpiresAt).toBeInstanceOf(Date);
  });

  it('routes to Tier 2 when affected domain is highly sensitive', async () => {
    await ClinicalRecord.create(
      buildClinicalRecord({
        patientId: patient._id,
        domain: 'PSYCHIATRY',
        sensitivityClassification: 'HIGHLY_SENSITIVE',
      }),
    );

    const result = await executeBreakGlassOverride({
      initiatedBy: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'UNCONSCIOUS_PATIENT',
      freeTextReason: 'Psychiatric crisis requiring immediate chart review',
      affectedDomains: ['PSYCHIATRY'],
    });

    expect(result.tier).toBe('TIER_2_HARD_OVERRIDE');
    expect(result.breakGlassLog.recordPhase).toBe('REQUEST');
    expect(result.reviewStatus).toBe('PENDING');
  });

  it('returns 409 when an active break-glass session already exists', async () => {
    await executeBreakGlassOverride({
      initiatedBy: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'TRANSFER_OF_CARE',
      freeTextReason: 'Initial emergency override for transfer of care',
      affectedDomains: ['CARDIOLOGY'],
    });

    await expect(
      executeBreakGlassOverride({
        initiatedBy: physician._id,
        targetPatientId: patient._id,
        clinicalJustificationCode: 'TRANSFER_OF_CARE',
        freeTextReason: 'Duplicate override attempt after active session',
        affectedDomains: ['CARDIOLOGY'],
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });
});
