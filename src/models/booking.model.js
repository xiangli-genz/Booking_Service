// models/booking.model.js
const mongoose = require("mongoose");

const seatSchema = new mongoose.Schema({
  seatNumber: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['standard', 'vip', 'couple'],
    default: 'standard'
  },
  price: {
    type: Number,
    required: true
  }
}, { _id: false });

const comboSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
  price: Number,
  totalPrice: Number
}, { _id: false });

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: String,
    fullName: String,
    phone: String,
    email: String,
    note: String,
    
    movieId: String,
    movieName: String,
    movieAvatar: String,
    cinema: String,
    showtime: {
      date: Date,
      time: String,
      format: String
    },
    
    seats: [seatSchema],
    combos: [comboSchema],
    
    subTotal: Number,
    comboTotal: Number,
    discount: {
      type: Number,
      default: 0
    },
    total: Number,
    paymentMethod: String,
    paymentStatus: String,
    status: String,
    userId: String,
    qrCode: String,
    
    updatedBy: String,
    deleted: {
      type: Boolean,
      default: false
    },
    deletedBy: String,
    deletedAt: Date
  },
  {
    timestamps: true,
  }
);

const Booking = mongoose.model('Booking', bookingSchema, "bookings");

module.exports = Booking;