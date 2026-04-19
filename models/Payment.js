const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  paymentMethod: { type: String, enum: ['KHQR','COD'], required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  status: { type: String, enum: ['pending','processing','paid','failed','expired','refunded'], default: 'pending' },
  transactionId: String,
  // KHQR specific
  khqrData: {
    qrCode: String,        // base64 QR image
    qrString: String,      // raw KHQR string
    md5: String,           // md5 of QR for verification
    merchantId: String,
    expiresAt: Date
  },
  // Verification
  verificationAttempts: { type: Number, default: 0 },
  lastVerifiedAt: Date,
  paidAt: Date,
  failureReason: String,
  metadata: mongoose.Schema.Types.Mixed
}, { timestamps: true });

paymentSchema.index({ order: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
