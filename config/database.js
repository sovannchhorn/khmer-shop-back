const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`✅ MongoDB: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`❌ MongoDB: ${err.message}`);
    process.exit(1);
  }
};
module.exports = connectDB;
