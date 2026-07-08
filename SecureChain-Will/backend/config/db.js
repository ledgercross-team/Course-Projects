const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/securechain_will";

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri);
  console.log("MongoDB connected");

  mongoose.connection.on("error", (err) => {
    console.error("MongoDB connection error:", err);
  });

  return mongoose.connection;
}

module.exports = connectDB;
