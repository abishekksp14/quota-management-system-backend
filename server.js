const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const quotaRoutes = require('./routes/quota');
const adminRoutes = require('./routes/admin');

const app = express();

// ─── CORS — Manual raw handler (must be FIRST, before everything) ─────────────
// The cors npm package was failing to intercept OPTIONS on Vercel's runtime.
// Setting headers manually guarantees the preflight always gets a 200 response.
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  // Immediately respond to preflight OPTIONS requests — do NOT pass to next()
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});
// ─────────────────────────────────────────────────────────────────────────────

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/quota', quotaRoutes);
app.use('/api/admin', adminRoutes);

// Health check — also shows DB state so you can confirm connection on Vercel
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    database: mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED',
    mongoUri: process.env.MONGODB_URI ? 'SET' : 'MISSING'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Quota Management API is running' });
});

// ─── MongoDB ──────────────────────────────────────────────────────────────────
// IMPORTANT: Do NOT use process.exit() here.
// On Vercel, process.exit() kills the serverless function before it can send ANY
// response, so the browser gets a raw TCP close — which it reports as a CORS error.
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Successfully connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err.message));
// ─────────────────────────────────────────────────────────────────────────────

// Local dev server only
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
