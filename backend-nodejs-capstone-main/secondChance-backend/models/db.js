const { MongoClient } = require("mongodb");
require("dotenv").config();

let dbInstance = null;

async function connectToDatabase() {
  if (dbInstance) return dbInstance;

  const client = new MongoClient(process.env.MONGO_URI || "mongodb://localhost:27017");
  await client.connect();   // 🔥 REQUIRED LINE

  dbInstance = client.db("secondChance");
  return dbInstance;
}

module.exports = connectToDatabase;
