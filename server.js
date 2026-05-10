const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('./db');

dotenv.config();

const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const quotaRoutes = require('./routes/quota');
const adminRoutes = require('./routes/admin');

const app = express();

// ─── CORS (raw, synchronous — must be first) ─────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());

// ─── DB connection middleware ─────────────────────────────────────────────────
// Vercel serverless: each lambda invocation is fresh. We must AWAIT the DB
// connection on every request, using a cached singleton to avoid reconnecting.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('DB connection error:', err.message);
    return res.status(503).json({ message: 'Database unavailable. Please try again.' });
  }
});
// ─────────────────────────────────────────────────────────────────────────────

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/quota', quotaRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    mongoUri: process.env.MONGODB_URI ? 'SET' : 'MISSING'
  });
});

// Root
app.get('/', (req, res) => {
  res.json({ message: 'Quota Management API is running' });
});

// Local dev only
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
