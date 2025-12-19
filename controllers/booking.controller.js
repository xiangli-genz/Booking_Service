// services/booking-service/controllers/booking.controller.js
const Booking = require('../models/booking.model');
const config = require('../config/config');
const { generateBookingCode } = require('../helpers/generate.helper');

// ===== [POST] /api/bookings/create =====
// Bước 1: Tạo booking tạm thời khi chọn ghế
module.exports.create = async (req, res) => {
  try {
    const { movieId, movieName, movieAvatar, cinema, showtimeDate, showtimeTime, showtimeFormat, seats, userId } = req.body;
    
    // Validate
    if (!movieId || !cinema || !showtimeDate || !showtimeTime || !seats || seats.length === 0) {
      return res.status(400).json({
        code: 'error',
        message: 'Thiếu thông tin đặt vé bắt buộc!'
      });
    }
    
    // Normalize seats
    const seatDetails = seats.map(seat => {
      if (typeof seat === 'object' && seat.seatNumber) {
        return {
          seatNumber: seat.seatNumber,
          type: seat.type || config.SEAT_TYPES.STANDARD,
          price: parseInt(seat.price) || config.DEFAULT_SEAT_PRICES[seat.type || 'standard']
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
    
    // Parse showtime date
    const showtimeDateObj = new Date(showtimeDate);
    if (isNaN(showtimeDateObj.getTime())) {
      return res.status(400).json({
        code: 'error',
        message: 'Ngày chiếu không hợp lệ!'
      });
    }
    
    // Kiểm tra ghế có available không
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
        code: 'error',
        message: `Ghế ${checkResult.unavailableSeats.join(', ')} đã được đặt. Vui lòng chọn ghế khác!`,
        unavailableSeats: checkResult.unavailableSeats
      });
    }
    
    // Tính tiền vé
    const subTotal = seatDetails.reduce((sum, seat) => sum + seat.price, 0);
    
    // Tạo booking code
    const bookingCode = generateBookingCode();
    
    // Tạo booking
    const booking = new Booking({
      bookingCode,
      movieId,
      movieName: movieName || 'Unknown Movie',
      movieAvatar: movieAvatar || '',
      cinema,
      showtime: {
        date: showtimeDateObj,
        time: showtimeTime,
        format: showtimeFormat || '2D'
      },
      seats: seatDetails,
      combos: [],
      subTotal,
      comboTotal: 0,
      discount: 0,
      total: subTotal,
      paymentMethod: null,
      paymentStatus: config.PAYMENT_STATUS.UNPAID,
      status: config.BOOKING_STATUS.PENDING,
      isTemporary: true,
      userId: userId || null
    });
    
    await booking.save();
    
    return res.status(201).json({
      code: 'success',
      message: 'Ghế đã được giữ trong 10 phút!',
      data: {
        bookingId: booking._id,
        bookingCode: booking.bookingCode,
        expiresAt: booking.expiresAt,
        timeRemaining: booking.getTimeRemaining(),
        seats: booking.seats,
        subTotal: booking.subTotal,
        total: booking.total
      }
    });
    
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({
      code: 'error',
      message: 'Không thể tạo booking',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ===== [PATCH] /api/bookings/:id/combos =====
// Bước 2: Cập nhật combo vào booking
module.exports.updateCombos = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { combos } = req.body;
    
    // Tìm booking
    const booking = await Booking.findOne({
      _id: bookingId,
      status: config.BOOKING_STATUS.PENDING,
      deleted: false
    });
    
    if (!booking) {
      return res.status(404).json({
        code: 'error',
        message: 'Booking không tồn tại!'
      });
    }
    
    // Kiểm tra hết hạn
    if (booking.isExpired()) {
      booking.status = config.BOOKING_STATUS.EXPIRED;
      await booking.save();
      
      return res.status(410).json({
        code: 'expired',
        message: 'Booking đã hết hạn!'
      });
    }
    
    // Parse combos
    const comboDetails = [];
    let comboTotal = 0;
    
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
    
    // Cập nhật booking
    booking.combos = comboDetails;
    booking.comboTotal = comboTotal;
    booking.total = booking.subTotal + comboTotal - booking.discount;
    
    await booking.save();
    
    return res.json({
      code: 'success',
      message: 'Cập nhật combo thành công!',
      data: {
        bookingId: booking._id,
        combos: booking.combos,
        comboTotal: booking.comboTotal,
        total: booking.total,
        expiresAt: booking.expiresAt,
        timeRemaining: booking.getTimeRemaining()
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

// ===== [PATCH] /api/bookings/:id/confirm =====
// Bước 3: Xác nhận booking (chuyển sang initial, chờ thanh toán)
module.exports.confirm = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { fullName, phone, email, note, paymentMethod } = req.body;
    
    // Validate
    if (!fullName || !phone) {
      return res.status(400).json({
        code: 'error',
        message: 'Vui lòng nhập đầy đủ họ tên và số điện thoại!'
      });
    }
    
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        code: 'error',
        message: 'Số điện thoại không đúng định dạng!'
      });
    }
    
    // Tìm booking
    const booking = await Booking.findOne({
      _id: bookingId,
      status: config.BOOKING_STATUS.PENDING,
      deleted: false
    });
    
    if (!booking) {
      return res.status(404).json({
        code: 'error',
        message: 'Booking không tồn tại!'
      });
    }
    
    // Kiểm tra hết hạn
    if (booking.isExpired()) {
      booking.status = config.BOOKING_STATUS.EXPIRED;
      await booking.save();
      
      return res.status(410).json({
        code: 'expired',
        message: 'Booking đã hết hạn!'
      });
    }
    
    // Cập nhật thông tin
    booking.fullName = fullName;
    booking.phone = phone;
    booking.email = email || '';
    booking.note = note || '';
    booking.paymentMethod = paymentMethod || 'money';
    booking.status = config.BOOKING_STATUS.INITIAL;
    booking.isTemporary = false;
    booking.expiresAt = null;
    
    await booking.save();
    
    return res.json({
      code: 'success',
      message: 'Xác nhận đặt vé thành công!',
      data: {
        bookingId: booking._id,
        bookingCode: booking.bookingCode,
        status: booking.status,
        total: booking.total
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

// ===== [GET] /api/bookings/:id =====
// Lấy thông tin booking
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
    
    // Check expired
    if (booking.isExpired() && booking.status === config.BOOKING_STATUS.PENDING) {
      booking.status = config.BOOKING_STATUS.EXPIRED;
      await booking.save();
    }
    
    return res.json({
      code: 'success',
      data: {
        booking: booking,
        timeRemaining: booking.getTimeRemaining(),
        isExpired: booking.isExpired()
      }
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
// Lấy danh sách ghế đã đặt
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

// ===== [GET] /api/bookings/:id/status =====
// Kiểm tra trạng thái và thời gian còn lại
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
    
    // Auto update status if expired
    if (booking.isExpired() && booking.status === config.BOOKING_STATUS.PENDING) {
      booking.status = config.BOOKING_STATUS.EXPIRED;
      await booking.save();
      
      return res.json({
        code: 'expired',
        message: 'Booking đã hết hạn!',
        data: {
          status: booking.status,
          timeRemaining: 0
        }
      });
    }
    
    return res.json({
      code: 'success',
      data: {
        status: booking.status,
        timeRemaining: booking.getTimeRemaining(),
        isExpired: booking.isExpired()
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

// ===== [DELETE] /api/bookings/:id =====
// Hủy booking
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
    
    // Chỉ cho phép hủy booking pending hoặc initial
    if (![config.BOOKING_STATUS.PENDING, config.BOOKING_STATUS.INITIAL].includes(booking.status)) {
      return res.status(400).json({
        code: 'error',
        message: 'Không thể hủy booking này!'
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