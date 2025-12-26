// services/booking-service/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bookingRoutes = require('./routes/booking.route');
const cleanupHelper = require('./helpers/cleanup.helper');

const app = express();
const PORT = process.env.BOOKING_SERVICE_PORT || 3001;

// ===== MIDDLEWARE =====
app.use(cors({
  origin: process.env.GATEWAY_URL || 'http://localhost:3000',
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
app.use('/api/bookings', bookingRoutes);

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
  console.log(`✓ Test UI available at: http://localhost:${PORT}/test`);
});

module.exports = app;