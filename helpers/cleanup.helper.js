// ===== services/booking-service/helpers/cleanup.helper.js =====
const cron = require('node-cron');
const Booking = require('../models/booking.model');
const config = require('../config/config');

// Chạy mỗi phút để cleanup booking hết hạn
module.exports.startCleanupJob = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      // Tìm tất cả booking pending đã hết hạn
      const expiredBookings = await Booking.find({
        status: config.BOOKING_STATUS.PENDING,
        expiresAt: { $lt: now },
        deleted: false
      });
      
      if (expiredBookings.length > 0) {
        // Bulk update
        await Booking.updateMany(
          {
            _id: { $in: expiredBookings.map(b => b._id) }
          },
          {
            $set: {
              status: config.BOOKING_STATUS.EXPIRED,
              deleted: true,
              deletedAt: now
            }
          }
        );
        
        console.log(`✓ [Cleanup] Expired ${expiredBookings.length} booking(s)`);
      }
    } catch (error) {
      console.error('✗ [Cleanup] Error:', error);
    }
  });
  
  console.log('✓ [Cleanup] Job started - Running every minute');
};