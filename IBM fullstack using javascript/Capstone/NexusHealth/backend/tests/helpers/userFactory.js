const buildBaseUser = (overrides = {}) => ({
  userId: '550e8400-e29b-41d4-a716-446655440000',
  role: 'PATIENT',
  credentials: {
    hashedPassword: '$2b$10$hashedpasswordplaceholder',
  },
  demographics: {
    legalName: {
      first: 'Jane',
      last: 'Doe',
    },
    dateOfBirth: new Date('1990-01-15'),
    biologicalSex: 'F',
    contactInfo: {
      email: 'jane.doe@example.com',
      preferredContactMethod: 'EMAIL',
    },
  },
  ...overrides,
});

const buildPatient = (overrides = {}) =>
  buildBaseUser({
    role: 'PATIENT',
    patientProfile: {
      mrn: 'MRN-10001',
      bloodType: 'O+',
    },
    ...overrides,
  });

const buildPhysician = (overrides = {}) =>
  buildBaseUser({
    userId: '660e8400-e29b-41d4-a716-446655440001',
    role: 'PHYSICIAN',
    demographics: {
      legalName: {
        first: 'John',
        last: 'Smith',
      },
      dateOfBirth: new Date('1975-06-20'),
      biologicalSex: 'M',
      contactInfo: {
        email: 'john.smith@hospital.org',
        preferredContactMethod: 'EMAIL',
      },
    },
    physicianProfile: {
      licenseNumber: 'MD-12345',
      npiNumber: '1234567890',
      specializations: ['CARDIOLOGY'],
      isCMO: false,
    },
    ...overrides,
  });

const buildCmo = (overrides = {}) =>
  buildPhysician({
    userId: '770e8400-e29b-41d4-a716-446655440002',
    role: 'CMO',
    physicianProfile: {
      licenseNumber: 'MD-67890',
      npiNumber: '0987654321',
      specializations: ['GENERAL_PRACTICE'],
      isCMO: true,
    },
    ...overrides,
  });

const buildAdmin = (overrides = {}) =>
  buildBaseUser({
    userId: 'cc0e8400-e29b-41d4-a716-446655440007',
    role: 'ADMIN',
    patientProfile: undefined,
    physicianProfile: undefined,
    ...overrides,
  });

const buildPharmacist = (overrides = {}) =>
  buildBaseUser({
    userId: 'dd0e8400-e29b-41d4-a716-446655440008',
    role: 'PHARMACIST',
    patientProfile: undefined,
    physicianProfile: undefined,
    ...overrides,
  });

module.exports = {
  buildBaseUser,
  buildPatient,
  buildPhysician,
  buildCmo,
  buildAdmin,
  buildPharmacist,
};
