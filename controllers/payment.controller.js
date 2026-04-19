const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { verifyKHQRPayment, simulatePayment } = require('../services/khqr.service');
const logger = require('../utils/logger');

/**
 * @swagger
 * /payments/khqr/verify/{paymentId}:
 *   post:
 *     summary: Verify KHQR payment status
 *     tags: [Payments]
 */
exports.verifyKHQR = async (req, res) => {
  const payment = await Payment.findById(req.params.paymentId);
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  if (payment.user.toString() !== req.user._id.toString())
    return res.status(403).json({ success: false, message: 'Access denied' });

  // Check if already paid
  if (payment.status === 'paid') return res.json({ success: true, paid: true, status: 'paid' });

  // Check expiry
  if (payment.khqrData?.expiresAt && new Date() > payment.khqrData.expiresAt) {
    payment.status = 'expired';
    await payment.save();
    return res.json({ success: true, paid: false, status: 'expired', message: 'QR code expired' });
  }

  payment.verificationAttempts += 1;
  payment.lastVerifiedAt = new Date();

  // Verify with Bakong
  let result;
  if (process.env.NODE_ENV === 'development' && req.query.simulate === 'true') {
    result = simulatePayment(payment.khqrData.md5);
    logger.info(`[DEV] Simulating payment for ${payment._id}`);
  } else {
    result = await verifyKHQRPayment(payment.khqrData.md5);
  }

  if (result.paid) {
    // Validate amount to prevent fraud
    const expectedAmount = payment.amount;
    if (result.amount && Math.abs(result.amount - expectedAmount) > 0.01) {
      logger.warn(`Amount mismatch: expected ${expectedAmount}, got ${result.amount}`);
      payment.status = 'failed';
      payment.failureReason = 'Amount mismatch';
      await payment.save();
      return res.json({ success: true, paid: false, status: 'failed', message: 'Payment amount mismatch' });
    }

    // Update payment
    payment.status = 'paid';
    payment.transactionId = result.transactionId;
    payment.paidAt = result.paidAt;
    await payment.save();

    // Update order
    const order = await Order.findByIdAndUpdate(payment.order, {
      paymentStatus: 'paid',
      transactionId: result.transactionId,
      paidAt: result.paidAt,
      status: 'confirmed',
      $push: { statusHistory: { status: 'confirmed', note: 'Payment confirmed via KHQR' } }
    }, { new: true });

    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${payment.user}`).emit('paymentConfirmed', { orderId: payment.order, orderNumber: order?.orderNumber, amount: payment.amount });
      io.to('admin').emit('paymentReceived', { orderId: payment.order, amount: payment.amount, method: 'KHQR' });
    }

    logger.info(`KHQR payment confirmed: order ${payment.order}, tx ${result.transactionId}`);
    return res.json({ success: true, paid: true, status: 'paid', transactionId: result.transactionId, paidAt: result.paidAt });
  }

  await payment.save();
  res.json({ success: true, paid: false, status: payment.status, attempts: payment.verificationAttempts });
};

exports.getPaymentStatus = async (req, res) => {
  const payment = await Payment.findOne({ order: req.params.orderId, user: req.user._id });
  if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
  res.json({ success: true, data: { status: payment.status, paidAt: payment.paidAt, transactionId: payment.transactionId, expiresAt: payment.khqrData?.expiresAt } });
};

exports.regenerateKHQR = async (req, res) => {
  const { generateKHQR } = require('../services/khqr.service');
  const order = await Order.findOne({ _id: req.params.orderId, user: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.paymentStatus === 'paid') return res.status(400).json({ success: false, message: 'Already paid' });

  const khqr = await generateKHQR({ orderId: order.orderNumber, amount: order.totalAmount, currency: 'USD' });
  const payment = await Payment.findOneAndUpdate(
    { order: order._id },
    { status: 'pending', 'khqrData.qrCode': khqr.qrCode, 'khqrData.qrString': khqr.qrString, 'khqrData.md5': khqr.md5, 'khqrData.expiresAt': khqr.expiresAt, verificationAttempts: 0 },
    { new: true, upsert: true }
  );

  res.json({ success: true, data: { paymentId: payment._id, qrCode: khqr.qrCode, expiresAt: khqr.expiresAt, amount: order.totalAmount } });
};
