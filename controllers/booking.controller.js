// booking-service/controllers/booking.controller.js - FIXED VERSION
const Booking = require('../models/booking.model');
const config = require('../config/config');
const { generateBookingCode } = require('../helpers/generate.helper');
const movieService = require('../helpers/movieService.helper');

// ===== [POST] /api/bookings/create =====
module.exports.create = async (req, res) => {
  try {
    const { 
      movieId, 
      cinema, showtimeDate, showtimeTime, 
      seats, combos,
      fullName, phone, email, note, paymentMethod,
      userId 
    } = req.body;
    
    console.log('=== CREATING BOOKING ===');
    console.log('Movie ID:', movieId);
    console.log('Cinema:', cinema);
    console.log('Showtime:', showtimeDate, showtimeTime);
    console.log('Seats:', seats);
    
    // ===== VALIDATE BASIC INPUT =====
    if (!movieId || !cinema || !showtimeDate || !showtimeTime) {
      return res.status(400).json({
        code: 'error',
        message: 'Thiếu thông tin đặt vé bắt buộc!'
      });
    }
    
    if (!seats || seats.length === 0) {
      return res.status(400).json({
        code: 'error',
        message: 'Phải chọn ít nhất 1 ghế!'
      });
    }
    
    if (!fullName || !phone) {
      return res.status(400).json({
        code: 'error',
        message: 'Vui lòng nhập họ tên và số điện thoại!'
      });
    }
    
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        code: 'error',
        message: 'Số điện thoại không hợp lệ!'
      });
    }
    
    // ===== STEP 1: GET MOVIE INFO FROM MOVIE SERVICE =====
    console.log('→ Fetching movie from Movie Service...');
    const movie = await movieService.getMovieById(movieId);
    
    if (!movie) {
      return res.status(404).json({
        code: 'error',
        message: 'Phim không tồn tại hoặc đã bị xóa!'
      });
    }
    
    console.log('✓ Movie found:', movie.name);
    
    // ===== STEP 2: VALIDATE SHOWTIME =====
    console.log('→ Validating showtime...');
    const showtimeValidation = movieService.validateShowtime(
      movie,
      cinema,
      showtimeDate,
      showtimeTime
    );
    
    if (!showtimeValidation.valid) {
      return res.status(400).json({
        code: 'error',
        message: showtimeValidation.message
      });
    }
    
    const validShowtime = showtimeValidation.showtime;
    console.log('✓ Showtime valid:', validShowtime);
    
    // ===== STEP 3: NORMALIZE & VALIDATE SEAT PRICES =====
    console.log('→ Validating seat prices...');
    const seatDetails = seats.map(seat => {
      if (typeof seat === 'object' && seat.seatNumber) {
        return {
          seatNumber: seat.seatNumber,
          type: seat.type || config.SEAT_TYPES.STANDARD,
          price: parseInt(seat.price) || 0
        };
      }
      return null;
    }).filter(Boolean);
    
    if (seatDetails.length === 0) {
      return res.status(400).json({
        code: 'error',
        message: 'Không có ghế hợp lệ!'
      });
    }
    
    // VALIDATE giá vé với Movie Service
    const priceValidation = movieService.validateSeatPrices(movie, seatDetails);
    
    if (!priceValidation.valid) {
      return res.status(400).json({
        code: 'error',
        message: priceValidation.message
      });
    }
    
    console.log('✓ Seat prices validated');
    
    // ===== STEP 4: PARSE SHOWTIME DATE =====
    const showtimeDateObj = new Date(showtimeDate);
    if (isNaN(showtimeDateObj.getTime())) {
      return res.status(400).json({
        code: 'error',
        message: 'Ngày chiếu không hợp lệ!'
      });
    }
    
    // ===== STEP 5: CHECK SEAT AVAILABILITY =====
    console.log('→ Checking seat availability...');
    const seatNumbers = seatDetails.map(s => s.seatNumber);
    const checkResult = await Booking.checkSeatsAvailable(
      movieId,
      cinema,
      showtimeDateObj,
      showtimeTime,
      seatNumbers
    );
    
    if (!checkResult.available) {
      return res.status(409).json({
        code: 'conflict',
        message: `Ghế ${checkResult.unavailableSeats.join(', ')} đã được đặt!`,
        unavailableSeats: checkResult.unavailableSeats
      });
    }
    
    console.log('✓ All seats available');
    
    // ===== STEP 6: CALCULATE PRICES =====
    const subTotal = seatDetails.reduce((sum, seat) => sum + seat.price, 0);
    
    let comboTotal = 0;
    const comboDetails = [];
    
    if (combos && typeof combos === 'object') {
      Object.keys(combos).forEach(key => {
        const combo = combos[key];
        if (combo && combo.quantity > 0) {
          const quantity = parseInt(combo.quantity) || 0;
          const price = parseInt(combo.price) || 0;
          const totalPrice = price * quantity;
          
          comboTotal += totalPrice;
          comboDetails.push({
            comboId: key,
            name: combo.name || key,
            quantity: quantity,
            price: price,
            totalPrice: totalPrice
          });
        }
      });
    }
    
    const discount = 0;
    const total = subTotal + comboTotal - discount;
    
    // ===== STEP 7: CREATE BOOKING =====
    const bookingCode = generateBookingCode();
    
    const booking = new Booking({
      bookingCode,
      
      // Customer info
      fullName,
      phone,
      email: email || '',
      note: note || '',
      
      // Movie info - SNAPSHOT từ Movie Service
      movieId,
      movieName: movie.name,
      movieAvatar: movie.avatar,
      
      // Showtime info - SNAPSHOT từ Movie Service
      cinema,
      showtime: {
        date: showtimeDateObj,
        time: showtimeTime,
        format: validShowtime.format
      },
      
      // Seats (đã validate giá)
      seats: seatDetails,
      
      // Combos
      combos: comboDetails,
      
      // Prices
      subTotal,
      comboTotal,
      discount,
      total,
      
      // Payment
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: config.PAYMENT_STATUS.UNPAID,
      
      // Status
      status: config.BOOKING_STATUS.CONFIRMED,
      isTemporary: false,
      
      // User
      userId: userId || null
    });
    
    await booking.save();
    
    console.log('✅ BOOKING CREATED:', booking.bookingCode);
    
    return res.status(201).json({
      code: 'success',
      message: 'Đặt vé thành công!',
      data: {
        bookingId: booking._id,
        bookingCode: booking.bookingCode,
        booking: {
          _id: booking._id,
          bookingCode: booking.bookingCode,
          movieName: booking.movieName,
          movieAvatar: booking.movieAvatar,
          cinema: booking.cinema,
          showtime: booking.showtime,
          seats: booking.seats,
          combos: booking.combos,
          fullName: booking.fullName,
          phone: booking.phone,
          subTotal: booking.subTotal,
          comboTotal: booking.comboTotal,
          total: booking.total,
          paymentMethod: booking.paymentMethod,
          paymentStatus: booking.paymentStatus,
          status: booking.status,
          createdAt: booking.createdAt
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể tạo booking',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===== [PATCH] /api/bookings/:id/combos - MISSING METHOD =====
module.exports.updateCombos = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { combos } = req.body;
    
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
    
    // Chỉ cho phép update combo khi booking đang pending hoặc initial
    if (![config.BOOKING_STATUS.PENDING, config.BOOKING_STATUS.INITIAL].includes(booking.status)) {
      return res.status(400).json({
        code: 'error',
        message: 'Không thể cập nhật combo cho booking này!'
      });
    }
    
    // Calculate new combo total
    let comboTotal = 0;
    const comboDetails = [];
    
    if (combos && typeof combos === 'object') {
      Object.keys(combos).forEach(key => {
        const combo = combos[key];
        if (combo && combo.quantity > 0) {
          const quantity = parseInt(combo.quantity) || 0;
          const price = parseInt(combo.price) || 0;
          const totalPrice = price * quantity;
          
          comboTotal += totalPrice;
          comboDetails.push({
            comboId: key,
            name: combo.name || key,
            quantity: quantity,
            price: price,
            totalPrice: totalPrice
          });
        }
      });
    }
    
    // Update booking
    booking.combos = comboDetails;
    booking.comboTotal = comboTotal;
    booking.total = booking.subTotal + comboTotal - booking.discount;
    
    await booking.save();
    
    return res.json({
      code: 'success',
      message: 'Cập nhật combo thành công!',
      data: {
        booking: {
          _id: booking._id,
          combos: booking.combos,
          comboTotal: booking.comboTotal,
          total: booking.total
        }
      }
    });
    
  } catch (error) {
    console.error('Error updating combos:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể cập nhật combo'
    });
  }
};

// ===== [PATCH] /api/bookings/:id/confirm - MISSING METHOD =====
module.exports.confirmImproved = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { fullName, phone, email, note, paymentMethod } = req.body;
    
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
    
    // Check if expired
    if (booking.isExpired()) {
      return res.status(400).json({
        code: 'error',
        message: 'Booking đã hết hạn!'
      });
    }
    
    // Validate required fields
    if (!fullName || !phone) {
      return res.status(400).json({
        code: 'error',
        message: 'Vui lòng nhập họ tên và số điện thoại!'
      });
    }
    
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        code: 'error',
        message: 'Số điện thoại không hợp lệ!'
      });
    }
    
    // Update booking
    booking.fullName = fullName;
    booking.phone = phone;
    booking.email = email || '';
    booking.note = note || '';
    booking.paymentMethod = paymentMethod || 'cash';
    booking.status = config.BOOKING_STATUS.INITIAL;
    booking.isTemporary = false;
    booking.expiresAt = null;
    
    await booking.save();
    
    return res.json({
      code: 'success',
      message: 'Xác nhận booking thành công!',
      data: {
        booking: {
          _id: booking._id,
          bookingCode: booking.bookingCode,
          status: booking.status,
          fullName: booking.fullName,
          phone: booking.phone,
          email: booking.email,
          total: booking.total
        }
      }
    });
    
  } catch (error) {
    console.error('Error confirming booking:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể xác nhận booking'
    });
  }
};

// ===== [GET] /api/bookings/:id/status - MISSING METHOD =====
module.exports.checkStatus = async (req, res) => {
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
    
    const isExpired = booking.isExpired();
    const timeRemaining = booking.getTimeRemaining();
    
    return res.json({
      code: 'success',
      data: {
        bookingId: booking._id,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        isExpired: isExpired,
        timeRemaining: timeRemaining,
        expiresAt: booking.expiresAt
      }
    });
    
  } catch (error) {
    console.error('Error checking status:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể kiểm tra trạng thái'
    });
  }
};

// ===== [GET] /api/bookings/:id =====
module.exports.getById = async (req, res) => {
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
};

// ===== [GET] /api/bookings/seats/booked =====
module.exports.getBookedSeats = async (req, res) => {
  try {
    const { movieId, cinema, date, time } = req.query;
    
    if (!movieId || !cinema || !date || !time) {
      return res.status(400).json({
        code: 'error',
        message: 'Thiếu thông tin cần thiết'
      });
    }
    
    const bookedSeats = await Booking.getBookedSeats(
      movieId,
      cinema,
      new Date(date),
      time
    );
    
    return res.json({
      code: 'success',
      data: {
        bookedSeats: bookedSeats
      }
    });
    
  } catch (error) {
    console.error('Error getting booked seats:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể lấy danh sách ghế đã đặt'
    });
  }
};

// ===== [PATCH] /api/bookings/:id/payment-completed =====
module.exports.markPaymentCompleted = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { paymentId, paymentCode, provider } = req.body;
    
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
    
    booking.paymentStatus = 'paid';
    booking.status = 'confirmed';
    booking.completedAt = new Date();
    
    if (!booking.metadata) {
      booking.metadata = {};
    }
    booking.metadata.paymentId = paymentId;
    booking.metadata.paymentCode = paymentCode;
    booking.metadata.paymentProvider = provider;
    
    await booking.save();
    
    return res.json({
      code: 'success',
      message: 'Cập nhật booking thành công!',
      data: {
        bookingId: booking._id,
        status: booking.status,
        paymentStatus: booking.paymentStatus
      }
    });
    
  } catch (error) {
    console.error('Error marking payment completed:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể cập nhật booking'
    });
  }
};

// ===== [DELETE] /api/bookings/:id =====
module.exports.cancel = async (req, res) => {
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
    
    booking.status = config.BOOKING_STATUS.CANCELLED;
    booking.deleted = true;
    booking.deletedAt = new Date();
    
    await booking.save();
    
    return res.json({
      code: 'success',
      message: 'Hủy booking thành công!'
    });
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể hủy booking'
    });
  }
};

// ===== [GET] /api/bookings/statistics =====
module.exports.getStatistics = async (req, res) => {
  try {
    const { movieId, cinema, startDate, endDate } = req.query;

    // Build query
    let query = { deleted: false };
    
    if (movieId) {
      query.movieId = movieId;
    }
    
    if (cinema) {
      query.cinema = cinema;
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

    // Aggregate statistics by status
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

    // Format results
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
        byStatus: statusStats,
        query: {
          movieId: movieId || 'all',
          cinema: cinema || 'all',
          startDate: startDate || 'all',
          endDate: endDate || 'all'
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting statistics:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể lấy thống kê'
    });
  }
};

// ===== [POST] /api/bookings/check-expired =====
module.exports.checkExpired = async (req, res) => {
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
};