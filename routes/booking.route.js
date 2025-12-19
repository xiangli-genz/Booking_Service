// services/booking-service/routes/booking.route.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');

// ===== BOOKING WORKFLOW =====

// Bước 1: Tạo booking tạm thời (giữ ghế 10 phút)
router.post('/create', bookingController.create);

// Bước 2: Cập nhật combo
router.patch('/:id/combos', bookingController.updateCombos);

// Bước 3: Xác nhận booking (chuyển sang initial)
router.patch('/:id/confirm', bookingController.confirm);

// ===== QUERY & MANAGEMENT =====

// Lấy thông tin booking
router.get('/:id', bookingController.getById);

// Kiểm tra trạng thái & thời gian còn lại
router.get('/:id/status', bookingController.checkStatus);

// Lấy danh sách ghế đã đặt
router.get('/seats/booked', bookingController.getBookedSeats);

// Hủy booking
router.delete('/:id', bookingController.cancel);

module.exports = router;