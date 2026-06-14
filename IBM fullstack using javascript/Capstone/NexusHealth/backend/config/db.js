const mongoose = require('mongoose');

const DB_NAME = process.env.MONGO_DB_NAME || 'healthplatform';

const connectDB = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGO_URI is not defined in environment variables');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, { dbName: DB_NAME });
  console.log(`Connected to MongoDB (${DB_NAME})`);
};

module.exports = { connectDB, DB_NAME };
