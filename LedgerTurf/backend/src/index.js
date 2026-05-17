const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

const errorMiddleware = require('./middleware/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const turfRoutes = require('./routes/turfRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Load environment variables
dotenv.config();

const app = express();

// =========================
// Middleware
// =========================
app.use(express.json());

const corsOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3010',
  'http://localhost:5173',
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      const allowed =
        corsOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        /^http:\/\/localhost:\d+$/.test(origin);
      callback(null, allowed ? origin : false);
    },
    credentials: true,
  })
);

// Ensure MongoDB is connected before API handlers (serverless-safe)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Database unavailable:', error.message);
    res.status(503).json({
      success: false,
      message: 'Database connection failed. Check MONGO_URI on the backend project.',
    });
  }
});

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// =========================
// Health Check Route
// =========================
app.get('/', (req, res) => {
  res.send('LedgerTurf API is running...');
});

app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    success: true,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// =========================
// API Routes
// =========================
app.use('/api/auth', authRoutes);
app.use('/api/turfs', turfRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// =========================
// Error Middleware
// =========================
app.use(errorMiddleware);

// =========================
// Server Setup
// =========================
const PORT = process.env.PORT || 5002;

// Only start the server locally. Vercel will use the exported app directly.
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(
      `Server running in ${
        process.env.NODE_ENV || 'development'
      } mode on port ${PORT}`
    );
  });

  // =========================
  // Graceful Shutdown
  // =========================
  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Forcefully shutting down...');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
}

// =========================
// Handle Uncaught Errors
// =========================
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

// Export the app for Vercel Serverless Functions
module.exports = app;