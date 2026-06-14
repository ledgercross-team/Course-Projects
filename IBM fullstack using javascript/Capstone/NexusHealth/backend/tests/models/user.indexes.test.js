const User = require('../../models/User');
const {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  ensureUserIndexes,
} = require('../setup/mongo');
const { buildPatient, buildPhysician, buildAdmin } = require('../helpers/userFactory');

describe('User indexes', () => {
  beforeAll(async () => {
    await connectTestDB();
    await ensureUserIndexes();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('rejects duplicate userId values', async () => {
    await User.create(buildPatient());

    await expect(
      User.create(
        buildPatient({
          userId: '550e8400-e29b-41d4-a716-446655440000',
          patientProfile: { mrn: 'MRN-10002', bloodType: 'A+' },
        })
      )
    ).rejects.toThrow(/duplicate key/i);
  });

  it('rejects duplicate physician npiNumber values', async () => {
    await User.create(buildPhysician());

    await expect(
      User.create(
        buildPhysician({
          userId: '880e8400-e29b-41d4-a716-446655440003',
          physicianProfile: {
            licenseNumber: 'MD-99999',
            npiNumber: '1234567890',
            specializations: ['NEUROLOGY'],
            isCMO: false,
          },
        })
      )
    ).rejects.toThrow(/duplicate key/i);
  });

  it('rejects duplicate patient mrn values', async () => {
    await User.create(buildPatient());

    await expect(
      User.create(
        buildPatient({
          userId: '990e8400-e29b-41d4-a716-446655440004',
          patientProfile: { mrn: 'MRN-10001', bloodType: 'B+' },
        })
      )
    ).rejects.toThrow(/duplicate key/i);
  });

  it('allows multiple users without npiNumber or mrn when sparse fields are absent', async () => {
    await User.create(buildAdmin({ userId: 'aa0e8400-e29b-41d4-a716-446655440005' }));

    await expect(
      User.create(buildAdmin({ userId: 'bb0e8400-e29b-41d4-a716-446655440006' }))
    ).resolves.toBeDefined();
  });
});
