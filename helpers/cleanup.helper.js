// ===== services/booking-service/helpers/cleanup.helper.js =====
const cron = require('node-cron');
const Booking = require('../models/booking.model');
const config = require('../config/config');

// Chạy mỗi phút để cleanup booking hết hạn
const cronImproved = require('node-cron');

module.exports.startCleanupJobImproved = () => {
  // Chạy mỗi phút
  cronImproved.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      
      const result = await Booking.updateMany(
        {
          status: config.BOOKING_STATUS.PENDING,
          expiresAt: { $lt: now },
          deleted: false
        },
        {
          $set: {
            status: config.BOOKING_STATUS.EXPIRED,
            deleted: true,
            deletedAt: now
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✓ [Cleanup] Expired ${result.modifiedCount} booking(s) at ${now.toLocaleString()}`);
      }
    } catch (error) {
      console.error('✗ [Cleanup] Error:', error);
    }
  });
  
  // Cleanup booking expired sau 24h (chạy mỗi giờ)
  cronImproved.schedule('0 * * * *', async () => {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const result = await Booking.deleteMany({
        status: config.BOOKING_STATUS.EXPIRED,
        deletedAt: { $lt: yesterday }
      });
      
      if (result.deletedCount > 0) {
        console.log(`✓ [Cleanup] Permanently deleted ${result.deletedCount} old expired booking(s)`);
      }
    } catch (error) {
      console.error('✗ [Cleanup] Error deleting old bookings:', error);
    }
  });
  
  console.log('✓ [Cleanup] Jobs started');
  console.log('  - Expire check: Every minute');
  console.log('  - Permanent delete: Every hour');
};

// Backward compatible alias
module.exports.startCleanupJob = module.exports.startCleanupJobImproved;

// ===== 7. POSTMAN COLLECTION (để test) =====

