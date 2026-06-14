const User = require('../../models/User');
const { buildPatient, buildPhysician } = require('../helpers/userFactory');

const expectValidationError = async (user) => {
  await expect(user.validate()).rejects.toThrow();
};

describe('User schema', () => {
  describe('baseline — already enforced by current model', () => {
    it('rejects documents when userId is missing', async () => {
      const user = new User(buildPatient({ userId: undefined }));

      await expectValidationError(user);
    });

    it('rejects an invalid role enum value', async () => {
      const user = new User(buildPatient({ role: 'INVALID_ROLE' }));

      await expectValidationError(user);
    });

    it('defaults accountStatus to PENDING_VERIFICATION', () => {
      const user = new User(buildPatient({ accountStatus: undefined }));

      expect(user.accountStatus).toBe('PENDING_VERIFICATION');
    });
  });

  describe('gaps — RED until User model is tightened', () => {
    it('requires physicianProfile.npiNumber when role is PHYSICIAN', async () => {
      const user = new User(
        buildPhysician({
          physicianProfile: {
            licenseNumber: 'MD-12345',
            specializations: ['CARDIOLOGY'],
            isCMO: false,
          },
        })
      );

      await expect(user.validate()).rejects.toMatchObject({
        errors: expect.objectContaining({
          'physicianProfile.npiNumber': expect.anything(),
        }),
      });
    });

    it('requires patientProfile.mrn when role is PATIENT', async () => {
      const user = new User(
        buildPatient({
          patientProfile: {
            bloodType: 'O+',
          },
        })
      );

      await expect(user.validate()).rejects.toMatchObject({
        errors: expect.objectContaining({
          'patientProfile.mrn': expect.anything(),
        }),
      });
    });

    it('allows isCMO true only when role is CMO', async () => {
      const user = new User(
        buildPhysician({
          physicianProfile: {
            licenseNumber: 'MD-12345',
            npiNumber: '1234567890',
            specializations: ['CARDIOLOGY'],
            isCMO: true,
          },
        })
      );

      await expect(user.validate()).rejects.toMatchObject({
        errors: expect.objectContaining({
          'physicianProfile.isCMO': expect.anything(),
        }),
      });
    });

    it('rejects physician specializations outside CLINICAL_DOMAINS', async () => {
      const user = new User(
        buildPhysician({
          physicianProfile: {
            licenseNumber: 'MD-12345',
            npiNumber: '1234567890',
            specializations: ['INVALID_SPECIALTY'],
            isCMO: false,
          },
        })
      );

      await expectValidationError(user);
    });

    it('omits sensitive credential fields from JSON serialization', () => {
      const user = new User(
        buildPatient({
          credentials: {
            hashedPassword: '$2b$10$hashedpasswordplaceholder',
            mfaSecret: 'encrypted-totp-seed',
            authSessionToken: 'rotating-session-token',
          },
        })
      );

      const json = user.toJSON();

      expect(json.credentials).toBeUndefined();
    });
  });
});
