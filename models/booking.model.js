// services/booking-service/models/booking.model.js
const mongoose = require('mongoose');
const config = require('../config/config');

const seatSchema = new mongoose.Schema({
  seatNumber: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(config.SEAT_TYPES),
    default: config.SEAT_TYPES.STANDARD
  },
  price: {
    type: Number,
    required: true
  }
}, { _id: false });

const comboSchema = new mongoose.Schema({
  comboId: String,
  name: String,
  quantity: {
    type: Number,
    min: 0
  },
  price: Number,
  totalPrice: Number
}, { _id: false });

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    
    // Thông tin khách hàng (optional khi tạo temp booking)
    fullName: String,
    phone: String,
    email: String,
    note: String,
    
    // Thông tin phim
    movieId: {
      type: String,
      required: true,
      index: true
    },
    movieName: String,
    movieAvatar: String,
    
    // Thông tin suất chiếu
    cinema: {
      type: String,
      required: true,
      index: true
    },
    showtime: {
      date: {
        type: Date,
        required: true,
        index: true
      },
      time: {
        type: String,
        required: true,
        index: true
      },
      format: {
        type: String,
        default: '2D'
      }
    },
    
    // Ghế đã đặt
    seats: {
      type: [seatSchema],
      required: true,
      validate: {
        validator: function(v) {
          return v && v.length > 0;
        },
        message: 'Phải chọn ít nhất 1 ghế'
      }
    },
    
    // Combo
    combos: [comboSchema],
    
    // Giá tiền
    subTotal: {
      type: Number,
      required: true,
      min: 0
    },
    comboTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Thanh toán
    paymentMethod: String,
    paymentStatus: {
      type: String,
      enum: Object.values(config.PAYMENT_STATUS),
      default: config.PAYMENT_STATUS.UNPAID
    },
    
    // Trạng thái
    status: {
      type: String,
      enum: Object.values(config.BOOKING_STATUS),
      default: config.BOOKING_STATUS.PENDING,
      index: true
    },
    
    // User
    userId: String,
    
    // Quản lý thời gian giữ ghế
    isTemporary: {
      type: Boolean,
      default: true
    },
    expiresAt: {
      type: Date,
      index: true
    },
    
    // Metadata
    completedAt: Date,
    qrCode: String,
    
    deleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: Date
  },
  {
    timestamps: true
  }
);

// ===== COMPOSITE INDEX ĐỂ QUERY NHANH =====
bookingSchema.index({ 
  movieId: 1, 
  cinema: 1, 
  'showtime.date': 1, 
  'showtime.time': 1,
  status: 1,
  deleted: 1
});

// ===== TTL INDEX: Tự động xóa booking expired sau 1 ngày =====
bookingSchema.index(
  { expiresAt: 1 }, 
  { 
    expireAfterSeconds: 86400, // 24 giờ
    partialFilterExpression: { 
      status: config.BOOKING_STATUS.EXPIRED 
    }
  }
);

// ===== PRE SAVE MIDDLEWARE =====
bookingSchema.pre('save', function(next) {
  // Set expiresAt cho booking tạm thời
  if (this.isNew && this.isTemporary && this.status === config.BOOKING_STATUS.PENDING) {
    this.expiresAt = new Date(Date.now() + config.SEAT_HOLD_DURATION);
  }
  
  // Xóa expiresAt khi booking được xác nhận
  if ([config.BOOKING_STATUS.CONFIRMED, config.BOOKING_STATUS.COMPLETED].includes(this.status)) {
    this.expiresAt = null;
    this.isTemporary = false;
  }
  
  // Set completedAt
  if (this.status === config.BOOKING_STATUS.COMPLETED && !this.completedAt) {
    this.completedAt = new Date();
  }
  
  next();
});

// ===== STATIC METHODS =====

// Tìm tất cả booking đang active (bao gồm pending chưa hết hạn)
bookingSchema.statics.findActiveBookings = function(movieId, cinema, date, time) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    movieId: movieId,
    cinema: cinema,
    'showtime.date': {
      $gte: startOfDay,
      $lte: endOfDay
    },
    'showtime.time': time,
    status: { 
      $in: [
        config.BOOKING_STATUS.PENDING,
        config.BOOKING_STATUS.INITIAL,
        config.BOOKING_STATUS.CONFIRMED
      ] 
    },
    deleted: false,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

// Lấy danh sách ghế đã đặt
bookingSchema.statics.getBookedSeats = async function(movieId, cinema, date, time) {
  const bookings = await this.findActiveBookings(movieId, cinema, date, time);
  
  const bookedSeats = [];
  bookings.forEach(booking => {
    booking.seats.forEach(seat => {
      bookedSeats.push(seat.seatNumber);
    });
  });
  
  return bookedSeats;
};

// Kiểm tra ghế có available không
bookingSchema.statics.checkSeatsAvailable = async function(movieId, cinema, date, time, seatNumbers) {
  const bookedSeats = await this.getBookedSeats(movieId, cinema, date, time);
  
  const unavailableSeats = seatNumbers.filter(seat => 
    bookedSeats.includes(seat)
  );
  
  return {
    available: unavailableSeats.length === 0,
    unavailableSeats: unavailableSeats
  };
};

// ===== INSTANCE METHODS =====

// Kiểm tra booking có hết hạn không
bookingSchema.methods.isExpired = function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

// Tính thời gian còn lại (seconds)
bookingSchema.methods.getTimeRemaining = function() {
  if (!this.expiresAt) return null;
  const remaining = Math.max(0, Math.floor((this.expiresAt - new Date()) / 1000));
  return remaining;
};

const Booking = mongoose.model('Booking', bookingSchema, 'bookings');

module.exports = Booking;