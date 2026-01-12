// services/booking-service/routes/booking.route.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const serviceAuth = require('../middleware/serviceAuth.middleware');

// ===== PUBLIC BOOKING API (for Main App) =====

// Lấy danh sách ghế đã đặt
// GET /api/bookings/seats/booked?movieId=xxx&cinema=CGV&date=2024-01-01&time=10:00
router.get('/', async (req, res) => {
  try {
    const { code } = req.query;
    
    if (!code) {
      return res.status(400).json({
        code: 'error',
        message: 'Thiếu booking code'
      });
    }
    
    const booking = await Booking.findOne({
      bookingCode: code,
      deleted: false
    });
    
    if (!booking) {
      return res.status(404).json({
        code: 'error',
        message: 'Booking không tồn tại!'
      });
    }
    
    return res.json({
      code: 'success',
      data: { booking }
    });
    
  } catch (error) {
    console.error('Error getting booking:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể lấy thông tin booking'
    });
  }
});

router.get('/seats/booked', bookingController.getBookedSeats);

// Thống kê (public hoặc có thể protect nếu cần)
// GET /api/bookings/statistics?movieId=xxx
router.get('/statistics', bookingController.getStatistics);

// Kiểm tra và xử lý booking hết hạn
// POST /api/bookings/check-expired
router.post('/check-expired', bookingController.checkExpired);

// Kiểm tra trạng thái booking
// GET /api/bookings/:id/status
router.get('/:id/status', bookingController.checkStatus);

// Lấy thông tin booking
// GET /api/bookings/:id
router.get('/:id', bookingController.getById);

// Tạo booking mới
// POST /api/bookings/create
router.post('/create', bookingController.create);

// Cập nhật combo
// PATCH /api/bookings/:id/combos
router.patch('/:id/combos', bookingController.updateCombos);

// Xác nhận booking
// PATCH /api/bookings/:id/confirm
router.patch('/:id/confirm', bookingController.confirmImproved);

// Hủy booking
// DELETE /api/bookings/:id
router.delete('/:id', bookingController.cancel);

// ===== INTER-SERVICE COMMUNICATION =====

// Callback từ Payment Service (protected)
// PATCH /api/bookings/:id/payment-completed
router.patch('/:id/payment-completed', serviceAuth, bookingController.markPaymentCompleted);

module.exports = router;