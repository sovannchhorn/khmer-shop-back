const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Cache connection for serverless (Vercel reuses function instances)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then(m => {
      logger.info(`✅ MongoDB connected`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    logger.error(`❌ MongoDB: ${err.message}`);
    throw err;
  }

  return cached.conn;
};

module.exports = connectDB;
