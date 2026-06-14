const User = require('../../models/User');
const {
  initiateTier1SoftOverride,
  initiateTier2Request,
  denyTier2Request,
} = require('../../services/breakGlassService');
const {
  verifyBreakGlassLogIntegrity,
  rebuildSealPayloadFromBreakGlassLog,
  sealAuditEvent,
} = require('../../utils/sealAuditEvent');
const { buildPatient, buildPhysician, buildCmo } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('break-glass log integrity verification', () => {
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

    patient = await User.create(buildPatient({ userId: 'patient-bg-int-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(
      buildPhysician({ userId: 'physician-bg-int-001', accountStatus: 'ACTIVE' }),
    );
    cmo = await User.create(buildCmo({ userId: 'cmo-bg-int-001', accountStatus: 'ACTIVE' }));
  });

  it('verifies integrity of a persisted Tier 1 break-glass log', async () => {
    const { breakGlassLog } = await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
      freeTextReason: 'Patient collapsed without consent on file',
      icdCodeContext: 'R55',
    });

    expect(verifyBreakGlassLogIntegrity(breakGlassLog)).toBe(true);
    expect(
      sealAuditEvent(rebuildSealPayloadFromBreakGlassLog(breakGlassLog)),
    ).toBe(breakGlassLog.signatureHash);
  });

  it('detects tampering of justification on a Tier 1 log document', async () => {
    const { breakGlassLog } = await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'EMERGENCY_DEPARTMENT',
      freeTextReason: 'Emergency department access without active consent',
    });

    const tampered = breakGlassLog.toObject();
    tampered.justification = {
      ...tampered.justification,
      freeTextReason: 'Post-hoc altered justification text',
    };

    expect(verifyBreakGlassLogIntegrity(tampered)).toBe(false);
  });

  it('verifies integrity of a Tier 2 request log', async () => {
    const { breakGlassLog } = await initiateTier2Request({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'UNCONSCIOUS_PATIENT',
      freeTextReason: 'Unresponsive patient requiring chart review',
    });

    expect(verifyBreakGlassLogIntegrity(breakGlassLog)).toBe(true);
  });

  it('verifies integrity of a Tier 2 denial log', async () => {
    const { breakGlassLog } = await initiateTier2Request({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'TRANSFER_OF_CARE',
      freeTextReason: 'Insufficient emergency justification for override',
    });

    const { denialLog } = await denyTier2Request({
      requestEventId: breakGlassLog.eventId,
      cmoMongoId: cmo._id,
    });

    expect(verifyBreakGlassLogIntegrity(denialLog)).toBe(true);
  });

  it('returns false when signatureHash is missing from the log document', async () => {
    const { breakGlassLog } = await initiateTier1SoftOverride({
      physicianMongoId: physician._id,
      targetPatientId: patient._id,
      clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
      freeTextReason: 'Missing hash integrity check baseline log',
    });

    const stripped = breakGlassLog.toObject();
    delete stripped.signatureHash;

    expect(verifyBreakGlassLogIntegrity(stripped)).toBe(false);
  });
});
