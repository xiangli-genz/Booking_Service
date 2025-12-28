// services/booking-service/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bookingRoutes = require('./routes/booking.route');
let adminBookingRoutes;
try {
  adminBookingRoutes = require('./routes/admin/booking.route');
} catch (err) {
  if (err.code !== 'MODULE_NOT_FOUND') throw err;
  console.warn('Admin booking routes not found - admin endpoints will be disabled');
}
const cleanupHelper = require('./helpers/cleanup.helper');

const app = express();
const PORT = process.env.BOOKING_SERVICE_PORT || 3002;

// ===== MIDDLEWARE =====
app.use(cors({
  origin: [
    process.env.GATEWAY_URL || 'http://localhost:8080',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== DATABASE CONNECTION =====
mongoose.connect(process.env.DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✓ Booking Service: Connected to MongoDB');
  cleanupHelper.startCleanupJob();
})
.catch(err => {
  console.error('✗ Booking Service: MongoDB connection error:', err);
  process.exit(1);
});

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'booking-service',
    timestamp: new Date().toISOString()
  });
});

// ===== API ROUTES =====
// Public booking routes (for main-app)
app.use('/api/bookings', bookingRoutes);

// Admin booking routes
if (adminBookingRoutes) {
  app.use('/api/admin/bookings', adminBookingRoutes);
}

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error('Booking Service Error:', err);
  
  // Nếu là API request
  if (req.path.startsWith('/api/')) {
    return res.status(500).json({
      code: 'error',
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      code: 'error',
      message: 'API endpoint not found'
    });
  }
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`✓ Booking Service running on port ${PORT}`);
  console.log(`✓ API available at: http://localhost:${PORT}/api/bookings`);
  console.log(`✓ Admin API available at: http://localhost:${PORT}/api/admin/bookings`);
});

module.exports = app;