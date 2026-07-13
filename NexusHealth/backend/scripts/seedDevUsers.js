// backend/scripts/seedDevUsers.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { connectDB } = require('../config/db');
const { User } = require('../models');
const { hashPassword } = require('../services/authService');
const { generateUniqueMrn } = require('../services/mrnService');

const DEV_PASSWORD = 'Password123!';

const seedUsers = [
  {
    userId: '550e8400-e29b-41d4-a716-446655440000',
    role: 'PATIENT',
    email: 'patient@dev.local',
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: '1990-01-15',
  },
  {
    userId: '660e8400-e29b-41d4-a716-446655440001',
    role: 'PHYSICIAN',
    email: 'physician@dev.local',
    firstName: 'John',
    lastName: 'Smith',
    npiNumber: '1234567890',
    licenseNumber: 'MD-12345',
    specializations: ['CARDIOLOGY'],
    dateOfBirth: '1975-06-20',
  },
  {
    userId: '770e8400-e29b-41d4-a716-446655440002',
    role: 'CMO',
    email: 'cmo@dev.local',
    firstName: 'Sarah',
    lastName: 'Chen',
    npiNumber: '0987654321',
    licenseNumber: 'MD-67890',
    specializations: ['GENERAL_PRACTICE'],
    dateOfBirth: '1970-04-12',
  },
  {
    userId: 'cc0e8400-e29b-41d4-a716-446655440007',
    role: 'ADMIN',
    email: 'admin@dev.local',
    firstName: 'Admin',
    lastName: 'User',
    dateOfBirth: '1985-08-01',
  },
];

const run = async () => {
  await connectDB();
  const hashedPassword = await hashPassword(DEV_PASSWORD);

  let physicianId;

  for (const entry of seedUsers) {
    const existing = await User.findOne({
      $or: [{ userId: entry.userId }, { 'demographics.contactInfo.email': entry.email }],
    });

    if (existing) {
      console.log(`Skipping existing user: ${entry.email}`);
      if (entry.role === 'PHYSICIAN') physicianId = existing._id;
      continue;
    }

    const payload = {
      userId: entry.userId,
      role: entry.role,
      accountStatus: 'ACTIVE',
      credentials: { hashedPassword },
      demographics: {
        legalName: { first: entry.firstName, last: entry.lastName },
        dateOfBirth: new Date(entry.dateOfBirth),
        contactInfo: {
          email: entry.email,
          preferredContactMethod: 'EMAIL',
        },
      },
    };

    if (entry.role === 'PATIENT') {
      payload.patientProfile = { mrn: await generateUniqueMrn() };
    }

    if (entry.role === 'PHYSICIAN' || entry.role === 'CMO') {
      payload.physicianProfile = {
        npiNumber: entry.npiNumber,
        licenseNumber: entry.licenseNumber,
        specializations: entry.specializations,
        isCMO: entry.role === 'CMO',
      };
    }

    const created = await User.create(payload);
    if (entry.role === 'PHYSICIAN') physicianId = created._id;
    console.log(`Created ${entry.role}: ${entry.email}`);
  }

  if (physicianId) {
    await User.updateOne(
      { 'demographics.contactInfo.email': 'patient@dev.local' },
      { $set: { 'patientProfile.primaryPhysicianId': physicianId } },
    );
    console.log('Linked patient primaryPhysicianId to seeded physician');
    await User.updateOne(
      { 'demographics.contactInfo.email': 'patient@dev.local' },
      { $addToSet: { 'patientProfile.careTeamPhysicianIds': physicianId } },
    );
  }

  console.log(`\nDev password for all seeded users: ${DEV_PASSWORD}`);
  process.exit(0);
};

run().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
