const cron = require('node-cron');
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const logger = require('../utils/logger');

const scheduleKHQRExpiry = () => {
  // Run every 2 minutes — expire pending KHQR payments past their expiry time
  cron.schedule('*/2 * * * *', async () => {
    try {
      const expiredPayments = await Payment.find({
        paymentMethod: 'KHQR',
        status: 'pending',
        'khqrData.expiresAt': { $lt: new Date() }
      });

      for (const payment of expiredPayments) {
        payment.status = 'expired';
        await payment.save();

        // Keep order as pending (user can retry)
        logger.info(`KHQR expired for order ${payment.order}`);
      }

      if (expiredPayments.length > 0) {
        logger.info(`Expired ${expiredPayments.length} KHQR payment(s)`);
      }
    } catch (err) {
      logger.error('KHQR expiry job error:', err.message);
    }
  });

  logger.info('⏰ KHQR expiry job scheduled (every 2 min)');
};

module.exports = { scheduleKHQRExpiry };
