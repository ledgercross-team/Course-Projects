const AuditLog = require('../../models/AuditLog');
const BreakGlassAuditLog = require('../../models/BreakGlassAuditLog');
const User = require('../../models/User');
const { initiateTier1SoftOverride } = require('../../services/breakGlassService');
const { clearNotificationQueue } = require('../../services/breakGlassNotificationService');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('breakGlassService initiation transactions', () => {
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

    patient = await User.create(buildPatient({ userId: 'patient-bg-tx-001', accountStatus: 'ACTIVE' }));
    physician = await User.create(
      buildPhysician({ userId: 'physician-bg-tx-001', accountStatus: 'ACTIVE' }),
    );
  });

  it('rolls back break-glass log creation when audit append fails inside the transaction', async () => {
    const originalCreate = AuditLog.create.bind(AuditLog);
    const createSpy = jest.spyOn(AuditLog, 'create').mockImplementation(async (docs, options) => {
      if (options?.session) {
        throw new Error('forced audit append failure');
      }

      return originalCreate(docs, options);
    });

    await expect(
      initiateTier1SoftOverride({
        physicianMongoId: physician._id,
        targetPatientId: patient._id,
        clinicalJustificationCode: 'LIFE_THREATENING_EVENT',
        freeTextReason: 'Transaction rollback verification for emergency access',
      }),
    ).rejects.toThrow('forced audit append failure');

    expect(await BreakGlassAuditLog.countDocuments()).toBe(0);
    expect(await AuditLog.countDocuments()).toBe(0);

    createSpy.mockRestore();
  });
});
