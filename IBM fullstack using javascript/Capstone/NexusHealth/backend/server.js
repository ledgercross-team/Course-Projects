require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const { ensureIndexes } = require('./config/indexes');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const metaRoutes = require('./routes/meta');
const userRoutes = require('./routes/users');
const adminUserRoutes = require('./routes/adminUsers');
const consentRoutes = require('./routes/consent');
const clinicalRecordRoutes = require('./routes/clinicalRecords');
const breakGlassRoutes = require('./routes/breakGlass');
const drugRoutes = require('./routes/drugs');
const prescriptionRoutes = require('./routes/prescriptions');
const adrReportRoutes = require('./routes/adrReports');
const prescriptionImageRoutes = require('./routes/prescriptionImages');

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Healthcare platform API',
    health: '/health',
  });
});

app.get('/health', async (_req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ db: 'disconnected' });
  }

  try {
    await mongoose.connection.db.admin().ping();
    return res.status(200).json({ db: 'ok' });
  } catch (error) {
    return res.status(503).json({ db: 'error', error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/clinical-records', clinicalRecordRoutes);
app.use('/api/break-glass', breakGlassRoutes);
app.use('/api/drugs', drugRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/adr-reports', adrReportRoutes);
app.use('/api/prescription-images', prescriptionImageRoutes);

app.use(errorHandler);

const startServer = async () => {
  const { resolveAuditSealSecret } = require('./utils/sealAuditEvent');
  resolveAuditSealSecret();

  await connectDB();
  await ensureIndexes();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

module.exports = { app, startServer };
