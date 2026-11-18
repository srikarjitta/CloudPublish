const mongoose = require('mongoose');

/**
 * Connect to MongoDB using Mongoose
 * Reads connection URI from environment variables (MONGODB_URI or MONGO_URI)
 * @returns {Promise<mongoose.Connection>}
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cloudpublish';

  const options = {
    serverSelectionTimeoutMS: 5000,
  };

  try {
    const conn = await mongoose.connect(uri, options);
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn.connection;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    throw error;
  }
}

/**
 * Check if MongoDB connection is active
 * @returns {boolean}
 */
function isDBConnected() {
  return mongoose.connection.readyState === 1;
}

/**
 * Gracefully disconnect from MongoDB
 */
async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('[MongoDB] Connection closed.');
  }
}

module.exports = {
  connectDB,
  isDBConnected,
  disconnectDB,
};
