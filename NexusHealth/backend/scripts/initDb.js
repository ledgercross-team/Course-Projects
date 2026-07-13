require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { connectDB } = require('../config/db');
const { ensureIndexes } = require('../config/indexes');

const initDatabase = async () => {
  try {
    await connectDB();
    await ensureIndexes();
    console.log('Database schema and indexes initialized successfully');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
};

initDatabase();
