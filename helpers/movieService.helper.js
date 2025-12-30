const axios = require('axios');

const MOVIE_SERVICE_URL = process.env.MOVIE_SERVICE_URL || 'http://localhost:3001';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || '';

/**
 * Gọi Movie Service để lấy thông tin phim
 */
const getMovieById = async (movieId) => {
  try {
    const response = await axios.get(
      `${MOVIE_SERVICE_URL}/api/catalog/client/movies/${movieId}`,
      {
        headers: {
          'X-Service-Token': SERVICE_TOKEN
        },
        timeout: 5000
      }
    );
    
    if (response.data.code === 'success') {
      return response.data.data; // ✅ Trả về data trực tiếp
    }
    
    console.warn('Movie not found:', movieId);
    return null;
  } catch (error) {
    console.error('Error calling Movie Service:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
    return null;
  }
};

/**
 * Validate suất chiếu có tồn tại không
 */
const validateShowtime = (movie, cinema, date, time) => {
  if (!movie || !movie.showtimes) {
    return {
      valid: false,
      message: 'Phim không có lịch chiếu'
    };
  }
  
  // Parse date để so sánh
  const searchDate = new Date(date);
  searchDate.setHours(0, 0, 0, 0);
  
  // Tìm showtime match
  const showtime = movie.showtimes.find(st => {
    const stDate = new Date(st.date);
    stDate.setHours(0, 0, 0, 0);
    
    return (
      st.cinema === cinema &&
      stDate.getTime() === searchDate.getTime() &&
      st.times.includes(time)
    );
  });
  
  if (!showtime) {
    return {
      valid: false,
      message: 'Suất chiếu không tồn tại'
    };
  }
  
  return {
    valid: true,
    showtime: showtime
  };
};

/**
 * Validate giá vé
 */
const validateSeatPrices = (movie, seats) => {
  if (!movie || !movie.prices) {
    return {
      valid: false,
      message: 'Không tìm thấy bảng giá vé'
    };
  }
  
  const errors = [];
  
  seats.forEach(seat => {
    const expectedPrice = movie.prices[seat.type];
    
    if (!expectedPrice) {
      errors.push(`Loại ghế "${seat.type}" không hợp lệ`);
      return;
    }
    
    if (seat.price !== expectedPrice) {
      errors.push(
        `Giá ghế ${seat.seatNumber} không đúng. ` +
        `Mong đợi ${expectedPrice}đ, nhận ${seat.price}đ`
      );
    }
  });
  
  if (errors.length > 0) {
    return {
      valid: false,
      message: errors.join('; ')
    };
  }
  
  return {
    valid: true
  };
};

module.exports = {
  getMovieById,
  validateShowtime,
  validateSeatPrices
};