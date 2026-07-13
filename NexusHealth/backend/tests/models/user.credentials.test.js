// backend/tests/models/user.credentials.test.js
const User = require('../../models/User');
const { buildPatient } = require('../helpers/userFactory');
const { connectTestDB, disconnectTestDB, clearDatabase } = require('../setup/mongo');

describe('User credentials serialization', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('omits credentials from toJSON', async () => {
    const user = await User.create(
      buildPatient({
        userId: 'patient-cred-json',
        accountStatus: 'ACTIVE',
        credentials: {
          hashedPassword: '$2b$10$hashedpasswordplaceholder',
          mfaSecret: 'secret',
          authSessionToken: 'token',
        },
      }),
    );

    const json = user.toJSON();
    expect(json.credentials).toBeUndefined();
  });

  it('omits credentials from toObject', async () => {
    const user = await User.create(
      buildPatient({
        userId: 'patient-cred-object',
        accountStatus: 'ACTIVE',
        credentials: {
          hashedPassword: '$2b$10$hashedpasswordplaceholder',
        },
      }),
    );

    const object = user.toObject();
    expect(object.credentials).toBeUndefined();
  });

  it('excludes hashedPassword from default lean queries', async () => {
    await User.create(
      buildPatient({
        userId: 'patient-cred-lean',
        accountStatus: 'ACTIVE',
        credentials: {
          hashedPassword: '$2b$10$hashedpasswordplaceholder',
        },
      }),
    );

    const user = await User.findOne({ userId: 'patient-cred-lean' }).lean();
    expect(user.credentials).toBeUndefined();
  });

  it('returns hashedPassword when explicitly selected', async () => {
    await User.create(
      buildPatient({
        userId: 'patient-cred-select',
        accountStatus: 'ACTIVE',
        credentials: {
          hashedPassword: '$2b$10$hashedpasswordplaceholder',
        },
      }),
    );

    const user = await User.findOne({ userId: 'patient-cred-select' })
      .select('+credentials')
      .lean();

    expect(user.credentials.hashedPassword).toBe('$2b$10$hashedpasswordplaceholder');
  });
});
