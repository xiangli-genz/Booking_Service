// services/booking-service/controllers/booking.controller.js
const Booking = require('../models/booking.model');
const config = require('../config/config');
const { generateBookingCode } = require('../helpers/generate.helper');

// ===== [POST] /api/bookings/create =====
module.exports.create = async (req, res) => {
  try {
    const { 
      movieId, movieName, movieAvatar, 
      cinema, showtimeDate, showtimeTime, showtimeFormat, 
      seats, combos,
      fullName, phone, email, note, paymentMethod,
      userId 
    } = req.body;
    
    console.log('=== RECEIVED BOOKING REQUEST ===');
    console.log('Movie:', movieName, movieId);
    console.log('Cinema:', cinema);
    console.log('Showtime:', showtimeDate, showtimeTime);
    console.log('Seats:', seats);
    console.log('Customer:', fullName, phone);
    
    // ===== VALIDATE =====
    if (!movieId || !cinema || !showtimeDate || !showtimeTime || !seats || seats.length === 0) {
      return res.status(400).json({
        code: 'error',
        message: 'Thiếu thông tin đặt vé bắt buộc!'
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
    
    // ===== NORMALIZE SEATS =====
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
    
    // ===== PARSE SHOWTIME DATE =====
    const showtimeDateObj = new Date(showtimeDate);
    if (isNaN(showtimeDateObj.getTime())) {
      return res.status(400).json({
        code: 'error',
        message: 'Ngày chiếu không hợp lệ!'
      });
    }
    
    // ===== CHECK SEATS AVAILABLE =====
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
        message: `Ghế ${checkResult.unavailableSeats.join(', ')} đã được đặt. Vui lòng chọn ghế khác!`,
        unavailableSeats: checkResult.unavailableSeats
      });
    }
    
    // ===== CALCULATE PRICES =====
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
    
    // ===== CREATE BOOKING =====
    const bookingCode = generateBookingCode();
    
    const booking = new Booking({
      bookingCode,
      
      // Customer info
      fullName,
      phone,
      email: email || '',
      note: note || '',
      
      // Movie info
      movieId,
      movieName: movieName || 'Unknown Movie',
      movieAvatar: movieAvatar || '',
      
      // Showtime info
      cinema,
      showtime: {
        date: showtimeDateObj,
        time: showtimeTime,
        format: showtimeFormat || '2D'
      },
      
      // Seats & Combos
      seats: seatDetails,
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
      status: config.BOOKING_STATUS.CONFIRMED, // ✅ Đặt luôn là CONFIRMED
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
          discount: booking.discount,
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

// ===== [PATCH] /api/bookings/:id/combos =====
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
        total: booking.total
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
module.exports.confirmImproved = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { fullName, phone, email, note, paymentMethod } = req.body;
    
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
    
    booking.fullName = fullName;
    booking.phone = phone;
    booking.email = email || '';
    booking.note = note || '';
    booking.paymentMethod = paymentMethod || 'money';
    booking.status = config.BOOKING_STATUS.CONFIRMED;
    
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
      data: {
        booking: booking
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
    
    return res.json({
      code: 'success',
      data: {
        status: booking.status,
        paymentStatus: booking.paymentStatus
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

// ===== [PATCH] /api/bookings/:id/payment-completed =====
module.exports.markPaymentCompleted = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { paymentId, paymentCode, amount, provider } = req.body;
    
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