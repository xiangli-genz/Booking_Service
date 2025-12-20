// services/booking-service/routes/booking.route.js
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const Booking = require('../models/booking.model');
const config = require('../config/config');
const serviceAuth = require('../middleware/serviceAuth.middleware');

// ===== BOOKING WORKFLOW =====

// Bước 1: Tạo booking tạm thời (giữ ghế 10 phút)
router.post('/create', bookingController.create);

// Bước 2: Cập nhật combo
router.patch('/:id/combos', bookingController.updateCombos);

// Bước 3: Xác nhận booking (chuyển sang initial)
router.patch('/:id/confirm', bookingController.confirmImproved);

// ===== QUERY & MANAGEMENT =====

// Lấy thông tin booking
router.get('/:id', bookingController.getById);

// Kiểm tra trạng thái & thời gian còn lại
router.get('/:id/status', bookingController.checkStatus);

// Lấy danh sách ghế đã đặt
router.get('/seats/booked', bookingController.getBookedSeats);

// Hủy booking
router.delete('/:id', bookingController.cancel);

// Kiểm tra và cập nhật trạng thái ghế hết hạn
router.post('/check-expired', async (req, res) => {
  try {
    const now = new Date();
    const expiredBookings = await Booking.find({
      status: config.BOOKING_STATUS.PENDING,
      expiresAt: { $lt: now },
      deleted: false
    });

    if (expiredBookings.length > 0) {
      await Booking.updateMany(
        { _id: { $in: expiredBookings.map(b => b._id) } },
        {
          $set: {
            status: config.BOOKING_STATUS.EXPIRED,
            deleted: true,
            deletedAt: now
          }
        }
      );

      return res.json({
        code: 'success',
        message: `Đã xử lý ${expiredBookings.length} booking hết hạn`,
        data: {
          count: expiredBookings.length,
          expiredBookingIds: expiredBookings.map(b => b._id)
        }
      });
    }

    return res.json({
      code: 'success',
      message: 'Không có booking nào hết hạn',
      data: { count: 0 }
    });
  } catch (error) {
    console.error('Error checking expired bookings:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể kiểm tra booking hết hạn'
    });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const { movieId, cinema, startDate, endDate } = req.query;

    let query = { deleted: false };
    
    if (movieId) query.movieId = movieId;
    if (cinema) query.cinema = cinema;
    
    if (startDate || endDate) {
      query['showtime.date'] = {};
      if (startDate) query['showtime.date'].$gte = new Date(startDate);
      if (endDate) query['showtime.date'].$lte = new Date(endDate);
    }

    const stats = await Booking.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalSeats: { $sum: { $size: '$seats' } }
        }
      }
    ]);

    const statusStats = {};
    let totalBookings = 0;
    let totalRevenue = 0;
    let totalSeats = 0;

    stats.forEach(stat => {
      statusStats[stat._id] = {
        count: stat.count,
        revenue: stat.totalRevenue,
        seats: stat.totalSeats
      };
      totalBookings += stat.count;
      totalRevenue += stat.totalRevenue;
      totalSeats += stat.totalSeats;
    });

    return res.json({
      code: 'success',
      data: {
        total: {
          bookings: totalBookings,
          revenue: totalRevenue,
          seats: totalSeats
        },
        byStatus: statusStats
      }
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể lấy thống kê'
    });
  }
});

router.patch('/:id/payment-completed', serviceAuth, bookingController.markPaymentCompleted);

module.exports = router;