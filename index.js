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

// ===== VIEW ENGINE SETUP =====
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname, 'public')));

// ===== SESSION & COOKIE =====
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'booking-service-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

// ===== MIDDLEWARE =====
app.use(cors({
  origin: process.env.GATEWAY_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===== LOCALS MIDDLEWARE (cho Pug) =====
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.messages = {
    success: req.session.successMessage || null,
    error: req.session.errorMessage || null
  };
  
  // Clear messages after displaying
  delete req.session.successMessage;
  delete req.session.errorMessage;
  
  next();
});

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

// ===== TEST UI ROUTES =====
app.get('/test', (req, res) => {
  res.render('test-booking', {
    pageTitle: 'Test Booking UI',
    movieDetail: {
      id: 'test-movie-123',
      name: 'Avengers: Endgame',
      avatar: '/images/avengers.jpg',
      ageRating: 'T13',
      language: 'Tiếng Anh - Phụ đề Việt',
      prices: {
        standard: 50000,
        vip: 60000,
        couple: 110000
      }
    },
    cinemaList: [
      { name: 'CGV Vincom' },
      { name: 'CGV Aeon Mall' },
      { name: 'Lotte Cinema' }
    ],
    combos: [
      { id: 'popcorn', name: 'Bắp Rang Bơ', price: 45000, description: '1 bắp rang bơ (L)' },
      { id: 'coke', name: 'Nước Ngọt', price: 35000, description: '1 ly nước ngọt (L)' },
      { id: 'combo', name: 'Combo Set', price: 95000, description: '1 bắp + 2 nước' }
    ]
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
  
  // Nếu là page request
  res.status(500).render('error-500', {
    pageTitle: 'Lỗi Server',
    error: process.env.NODE_ENV === 'development' ? err : null
  });
});

// ===== 404 HANDLER =====
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      code: 'error',
      message: 'API endpoint not found'
    });
  }
  
  res.status(404).render('error-404', {
    pageTitle: 'Không Tìm Thấy Trang'
  });
});

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`✓ Booking Service running on port ${PORT}`);
  console.log(`✓ Test UI available at: http://localhost:${PORT}/test`);
});

module.exports = app;