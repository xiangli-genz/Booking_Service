// services/booking-service/config/config.js

module.exports = {
  // Thời gian giữ ghế (milliseconds)
  SEAT_HOLD_DURATION: 10 * 60 * 1000, // 10 phút
  
  // Trạng thái booking
  BOOKING_STATUS: {
    PENDING: 'pending',        // Đang giữ ghế (chưa xác nhận)
    INITIAL: 'initial',        // Đã xác nhận, chờ thanh toán
    CONFIRMED: 'confirmed',    // Đã thanh toán/xác nhận
    CANCELLED: 'cancelled',    // Đã hủy
    COMPLETED: 'completed',    // Hoàn thành
    EXPIRED: 'expired'         // Hết hạn (không thanh toán trong 10p)
  },
  
  // Trạng thái thanh toán
  PAYMENT_STATUS: {
    UNPAID: 'unpaid',
    PAID: 'paid'
  },
  
  // Loại ghế
  SEAT_TYPES: {
    STANDARD: 'standard',
    VIP: 'vip',
    COUPLE: 'couple'
  },
  
  // Giá ghế mặc định
  DEFAULT_SEAT_PRICES: {
    standard: 50000,
    vip: 60000,
    couple: 110000
  },
  
  // Combo mặc định
  DEFAULT_COMBOS: [
    { id: 'popcorn', name: 'Bắp Rang Bơ', price: 45000, description: '1 bắp rang bơ (L)' },
    { id: 'coke', name: 'Nước Ngọt', price: 35000, description: '1 ly nước ngọt (L)' },
    { id: 'hotdog', name: 'Hotdog', price: 30000, description: '1 hotdog' },
    { id: 'water', name: 'Nước Suối', price: 15000, description: '1 chai nước suối' },
    { id: 'comboset', name: 'Combo Set', price: 95000, description: '1 bắp (L) + 2 nước ngọt (L)' }
  ]
};