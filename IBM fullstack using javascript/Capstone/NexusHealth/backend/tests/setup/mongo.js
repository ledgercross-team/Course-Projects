const { MongoMemoryReplSet } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

const connectTestDB = async () => {
  mongoServer = await MongoMemoryReplSet.create({
    replSet: {
      count: 1,
    },
  });
  await mongoServer.waitUntilRunning();
  const uri = mongoServer.getUri();

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  await mongoose.connect(uri, { dbName: 'healthplatform_test' });
};

const disconnectTestDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = undefined;
  }
};

const APPEND_ONLY_COLLECTIONS = new Set(['audit_logs', 'breakGlassAuditLogs']);

const clearDatabase = async () => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  const { collections } = mongoose.connection;

  await Promise.all(
    Object.values(collections).map(async (collection) => {
      const { collectionName } = collection;

      if (APPEND_ONLY_COLLECTIONS.has(collectionName)) {
        return mongoose.connection.dropCollection(collectionName).catch((error) => {
          if (error.codeName !== 'NamespaceNotFound') {
            throw error;
          }
        });
      }

      return collection.deleteMany({});
    })
  );
};

const ensureUserIndexes = async () => {
  const User = require('../../models/User');

  await User.collection.createIndex(
    { 'physicianProfile.npiNumber': 1 },
    { unique: true, sparse: true, name: 'physician_npi_unique' }
  );
  await User.collection.createIndex(
    { 'patientProfile.mrn': 1 },
    { unique: true, sparse: true, name: 'patient_mrn_unique' }
  );
  await User.collection.createIndex(
    { role: 1, accountStatus: 1 },
    { name: 'role_account_status' }
  );
};

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearDatabase,
  ensureUserIndexes,
};
