const mongoose = require('mongoose');

let cachedConnection = null;

const connectDB = async () => {
  // If already connected, reuse the cached connection
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Fail fast if Atlas is unreachable
    });
    cachedConnection = conn;
    console.log('MongoDB connected:', conn.connection.host);
    return conn;
  } catch (err) {
    cachedConnection = null;
    console.error('MongoDB connection failed:', err.message);
    throw err;
  }
};

module.exports = connectDB;
