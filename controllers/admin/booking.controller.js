// services/booking-service/controllers/admin/booking.controller.js
const Booking = require('../../models/booking.model');
const config = require('../../config/config');

// ===== [GET] /api/admin/bookings - Lấy danh sách tất cả booking =====
module.exports.list = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      paymentStatus,
      keyword,
      startDate,
      endDate,
      cinema,
      movieId
    } = req.query;

    // Build query
    const query = { deleted: false };

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by payment status
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    // Filter by cinema
    if (cinema) {
      query.cinema = { $regex: cinema, $options: 'i' };
    }

    // Filter by movieId
    if (movieId) {
      query.movieId = movieId;
    }

    // Search by keyword (bookingCode, fullName, phone)
    if (keyword) {
      query.$or = [
        { bookingCode: { $regex: keyword, $options: 'i' } },
        { fullName: { $regex: keyword, $options: 'i' } },
        { phone: { $regex: keyword, $options: 'i' } },
        { email: { $regex: keyword, $options: 'i' } }
      ];
    }

    // Filter by date range
    if (startDate || endDate) {
      query['showtime.date'] = {};
      if (startDate) {
        query['showtime.date'].$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query['showtime.date'].$lte = end;
      }
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Booking.countDocuments(query);

    // Get bookings
    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Format data
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      createdAtFormat: new Date(booking.createdAt).toLocaleString('vi-VN'),
      showtimeDateFormat: new Date(booking.showtime.date).toLocaleDateString('vi-VN'),
      totalFormat: booking.total.toLocaleString('vi-VN'),
      subTotalFormat: booking.subTotal.toLocaleString('vi-VN'),
      comboTotalFormat: booking.comboTotal.toLocaleString('vi-VN')
    }));

    return res.json({
      code: 'success',
      data: {
        bookings: formattedBookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error getting bookings list:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể lấy danh sách booking'
    });
  }
};

// ===== [GET] /api/admin/bookings/:id - Lấy chi tiết booking =====
module.exports.detail = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findOne({
      _id: bookingId,
      deleted: false
    }).lean();

    if (!booking) {
      return res.status(404).json({
        code: 'error',
        message: 'Booking không tồn tại!'
      });
    }

    // Format data
    const formattedBooking = {
      ...booking,
      createdAtFormat: new Date(booking.createdAt).toLocaleString('vi-VN'),
      showtimeDateFormat: new Date(booking.showtime.date).toLocaleDateString('vi-VN'),
      totalFormat: booking.total.toLocaleString('vi-VN'),
      subTotalFormat: booking.subTotal.toLocaleString('vi-VN'),
      comboTotalFormat: booking.comboTotal.toLocaleString('vi-VN')
    };

    return res.json({
      code: 'success',
      data: {
        booking: formattedBooking
      }
    });

  } catch (error) {
    console.error('Error getting booking detail:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể lấy thông tin booking'
    });
  }
};

// ===== [PATCH] /api/admin/bookings/:id - Cập nhật booking =====
module.exports.update = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const {
      fullName,
      phone,
      email,
      note,
      status,
      paymentStatus,
      paymentMethod
    } = req.body;

    const booking = await Booking.findOne({
      _id: bookingId,
      deleted: false
    });

    if (!booking) {
      return res.status(404).json({
        code: 'error',
        message: 'Booking không tồn tại!'
      });
    }

    // Validate phone
    if (phone) {
      const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          code: 'error',
          message: 'Số điện thoại không hợp lệ!'
        });
      }
    }

    // Update fields
    if (fullName !== undefined) booking.fullName = fullName;
    if (phone !== undefined) booking.phone = phone;
    if (email !== undefined) booking.email = email;
    if (note !== undefined) booking.note = note;
    if (paymentMethod !== undefined) booking.paymentMethod = paymentMethod;

    // Update status
    if (status !== undefined) {
      // Validate status transition
      const validStatuses = Object.values(config.BOOKING_STATUS);
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          code: 'error',
          message: 'Trạng thái không hợp lệ!'
        });
      }
      booking.status = status;

      // Set completedAt if status is completed
      if (status === config.BOOKING_STATUS.COMPLETED && !booking.completedAt) {
        booking.completedAt = new Date();
      }
    }

    // Update payment status
    if (paymentStatus !== undefined) {
      const validPaymentStatuses = Object.values(config.PAYMENT_STATUS);
      if (!validPaymentStatuses.includes(paymentStatus)) {
        return res.status(400).json({
          code: 'error',
          message: 'Trạng thái thanh toán không hợp lệ!'
        });
      }
      booking.paymentStatus = paymentStatus;
    }

    await booking.save();

    return res.json({
      code: 'success',
      message: 'Cập nhật booking thành công!',
      data: {
        booking: {
          _id: booking._id,
          bookingCode: booking.bookingCode,
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          fullName: booking.fullName,
          phone: booking.phone,
          email: booking.email,
          note: booking.note
        }
      }
    });

  } catch (error) {
    console.error('Error updating booking:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể cập nhật booking'
    });
  }
};

// ===== [DELETE] /api/admin/bookings/:id - Xóa booking (soft delete) =====
module.exports.delete = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findOne({
      _id: bookingId,
      deleted: false
    });

    if (!booking) {
      return res.status(404).json({
        code: 'error',
        message: 'Booking không tồn tại!'
      });
    }

    // Soft delete
    booking.deleted = true;
    booking.deletedAt = new Date();
    booking.status = config.BOOKING_STATUS.CANCELLED;

    await booking.save();

    return res.json({
      code: 'success',
      message: 'Xóa booking thành công!'
    });

  } catch (error) {
    console.error('Error deleting booking:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể xóa booking'
    });
  }
};

// ===== [PATCH] /api/admin/bookings/change-multi - Thay đổi nhiều booking =====
module.exports.changeMulti = async (req, res) => {
  try {
    const { ids, option } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        code: 'error',
        message: 'Vui lòng chọn ít nhất một booking!'
      });
    }

    if (!option) {
      return res.status(400).json({
        code: 'error',
        message: 'Vui lòng chọn hành động!'
      });
    }

    const updateData = {};

    switch (option) {
      case 'confirmed':
        updateData.status = config.BOOKING_STATUS.CONFIRMED;
        break;
      case 'completed':
        updateData.status = config.BOOKING_STATUS.COMPLETED;
        updateData.completedAt = new Date();
        break;
      case 'cancelled':
        updateData.status = config.BOOKING_STATUS.CANCELLED;
        break;
      case 'delete':
        updateData.deleted = true;
        updateData.deletedAt = new Date();
        updateData.status = config.BOOKING_STATUS.CANCELLED;
        break;
      case 'paid':
        updateData.paymentStatus = config.PAYMENT_STATUS.PAID;
        break;
      case 'unpaid':
        updateData.paymentStatus = config.PAYMENT_STATUS.UNPAID;
        break;
      default:
        return res.status(400).json({
          code: 'error',
          message: 'Hành động không hợp lệ!'
        });
    }

    const result = await Booking.updateMany(
      { _id: { $in: ids }, deleted: false },
      { $set: updateData }
    );

    return res.json({
      code: 'success',
      message: `Đã cập nhật ${result.modifiedCount} booking!`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error changing multiple bookings:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể cập nhật booking'
    });
  }
};

// ===== [GET] /api/admin/bookings/statistics - Thống kê =====
module.exports.statistics = async (req, res) => {
  try {
    const { startDate, endDate, cinema, movieId } = req.query;

    const query = { deleted: false };

    // Filter by date range
    if (startDate || endDate) {
      query['showtime.date'] = {};
      if (startDate) {
        query['showtime.date'].$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query['showtime.date'].$lte = end;
      }
    }

    if (cinema) {
      query.cinema = cinema;
    }

    if (movieId) {
      query.movieId = movieId;
    }

    // Get statistics
    const stats = await Booking.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalSeats: { $sum: { $size: '$seats' } },
          confirmedBookings: {
            $sum: {
              $cond: [{ $eq: ['$status', config.BOOKING_STATUS.CONFIRMED] }, 1, 0]
            }
          },
          completedBookings: {
            $sum: {
              $cond: [{ $eq: ['$status', config.BOOKING_STATUS.COMPLETED] }, 1, 0]
            }
          },
          cancelledBookings: {
            $sum: {
              $cond: [{ $eq: ['$status', config.BOOKING_STATUS.CANCELLED] }, 1, 0]
            }
          },
          paidBookings: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', config.PAYMENT_STATUS.PAID] }, 1, 0]
            }
          },
          unpaidBookings: {
            $sum: {
              $cond: [{ $eq: ['$paymentStatus', config.PAYMENT_STATUS.UNPAID] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      totalSeats: 0,
      confirmedBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      paidBookings: 0,
      unpaidBookings: 0
    };

    return res.json({
      code: 'success',
      data: result
    });

  } catch (error) {
    console.error('Error getting statistics:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể lấy thống kê'
    });
  }
};