// services/booking-service/routes/admin/booking.route.js
const express = require('express');
const router = express.Router();
const adminBookingController = require('../../controllers/admin/booking.controller');

// ===== ADMIN - QUẢN LÝ BOOKING =====

// Danh sách booking (có filter, search, pagination)
// GET /api/admin/bookings?page=1&limit=20&status=confirmed&keyword=BK123
router.get('/', adminBookingController.list);

// Thống kê
// GET /api/admin/bookings/statistics?startDate=2024-01-01&endDate=2024-12-31
router.get('/statistics', adminBookingController.statistics);

// Thay đổi nhiều booking
// PATCH /api/admin/bookings/change-multi
router.patch('/change-multi', adminBookingController.changeMulti);

// Chi tiết booking
// GET /api/admin/bookings/:id
router.get('/:id', adminBookingController.detail);

// Cập nhật booking
// PATCH /api/admin/bookings/:id
router.patch('/:id', adminBookingController.update);

// Xóa booking
// DELETE /api/admin/bookings/:id
router.delete('/:id', adminBookingController.delete);

module.exports = router;