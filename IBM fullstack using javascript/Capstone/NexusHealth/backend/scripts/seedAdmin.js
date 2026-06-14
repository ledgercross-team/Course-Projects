// backend/scripts/seedAdmin.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { connectDB } = require('../config/db');
const { User } = require('../models');
const { hashPassword } = require('../services/authService');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@dev.local';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Password123!';

const run = async () => {
  await connectDB();

  const existing = await User.findOne({
    $or: [
      { role: 'ADMIN', accountStatus: 'ACTIVE' },
      { 'demographics.contactInfo.email': ADMIN_EMAIL },
    ],
  });

  if (existing) {
    console.log(`Admin already exists: ${existing.demographics?.contactInfo?.email || existing.userId}`);
    process.exit(0);
  }

  const hashedPassword = await hashPassword(ADMIN_PASSWORD);

  await User.create({
    userId: 'cc0e8400-e29b-41d4-a716-446655440007',
    role: 'ADMIN',
    accountStatus: 'ACTIVE',
    credentials: { hashedPassword },
    demographics: {
      legalName: { first: 'Admin', last: 'User' },
      dateOfBirth: new Date('1985-08-01'),
      contactInfo: {
        email: ADMIN_EMAIL,
        preferredContactMethod: 'EMAIL',
      },
    },
  });

  console.log(`Created ADMIN: ${ADMIN_EMAIL}`);
  console.log(`Bootstrap password: ${ADMIN_PASSWORD}`);
  process.exit(0);
};

run().catch((error) => {
  console.error('Seed admin failed:', error.message);
  process.exit(1);
});
