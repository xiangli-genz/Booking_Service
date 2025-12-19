// ===== services/booking-service/helpers/validator.helper.js =====
module.exports.validatePhone = (phone) => {
  const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/g;
  return phoneRegex.test(phone);
};

module.exports.validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

module.exports.validateSeats = (seats) => {
  if (!Array.isArray(seats) || seats.length === 0) {
    return { valid: false, message: 'Phải chọn ít nhất 1 ghế' };
  }
  
  for (const seat of seats) {
    if (typeof seat !== 'object' || !seat.seatNumber || !seat.price) {
      return { valid: false, message: 'Thông tin ghế không hợp lệ' };
    }
  }
  
  return { valid: true };
};