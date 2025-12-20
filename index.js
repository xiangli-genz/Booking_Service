// services/booking-service/index.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bookingRoutes = require('./routes/booking.route');
const cleanupHelper = require('./helpers/cleanup.helper');

const app = express();
const PORT = process.env.BOOKING_SERVICE_PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.GATEWAY_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.DATABASE, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✓ Booking Service: Connected to MongoDB');
  
  // Start cleanup job after DB connected
  cleanupHelper.startCleanupJob();
})
.catch(err => {
  console.error('✗ Booking Service: MongoDB connection error:', err);
  process.exit(1);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'booking-service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/bookings', bookingRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Booking Service Error:', err);
  res.status(500).json({
    code: 'error',
    message: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Booking Service running on port ${PORT}`);
});

module.exports = app;