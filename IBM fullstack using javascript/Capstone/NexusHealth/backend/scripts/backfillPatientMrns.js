// backend/scripts/backfillPatientMrns.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { connectDB } = require('../config/db');
const { backfillMissingPatientMrns, reassignInvalidOrDuplicateMrns } = require('../services/mrnService');

const run = async () => {
  await connectDB();
  const missingUpdated = await backfillMissingPatientMrns();
  const repairedUpdated = await reassignInvalidOrDuplicateMrns();
  console.log(`Assigned MRNs to ${missingUpdated} patient(s) without one.`);
  console.log(`Reassigned MRNs for ${repairedUpdated} patient(s) with invalid/duplicate values.`);
  process.exit(0);
};

run().catch((error) => {
  console.error('MRN backfill failed:', error.message);
  process.exit(1);
});
