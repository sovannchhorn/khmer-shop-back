/**
 * KHQR / Bakong Payment Service
 * Implements NBC (National Bank of Cambodia) KHQR specification
 * Docs: https://bakong.nbc.gov.kh/download/KHQR_Specification.pdf
 */
const QRCode = require('qrcode');
const crypto = require('crypto');
const axios = require('axios');
const logger = require('../utils/logger');

// CRC-16/CCITT-FALSE as per EMV QR spec
function crc16(data) {
  let crc = 0xFFFF;
  for (const byte of Buffer.from(data, 'utf8')) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
  }
  return ((crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'));
}

function tlv(tag, value) {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * Build KHQR string per NBC EMV QR Code specification
 */
function buildKHQRString({ merchantId, merchantName, city, amount, currency, orderId }) {
  const cur = currency === 'KHR' ? '116' : '840'; // ISO 4217
  const cur_str = currency === 'KHR' ? 'KHR' : 'USD';

  let payload = '';
  payload += tlv('00', '01'); // Payload Format Indicator
  payload += tlv('01', '12'); // Point of Initiation: 12 = dynamic
  
  // Merchant Account Info (tag 29 = Bakong)
  const merchantAccInfo = tlv('00', 'dev.bakong.com.kh') + tlv('01', merchantId);
  payload += tlv('29', merchantAccInfo);

  payload += tlv('52', '5999'); // MCC: Retail
  payload += tlv('53', cur);   // Currency
  
  if (amount > 0) {
    payload += tlv('54', amount.toFixed(2));
  }
  
  payload += tlv('58', 'KH'); // Country Code
  payload += tlv('59', merchantName.slice(0, 25));
  payload += tlv('60', city.slice(0, 15));
  
  // Reference: order ID
  const addlData = tlv('05', orderId.slice(0, 25));
  payload += tlv('62', addlData);

  // CRC (tag 63, always 4 chars)
  payload += '6304';
  payload += crc16(payload);

  return payload;
}

/**
 * Generate KHQR payment data for an order
 */
const generateKHQR = async ({ orderId, amount, currency = 'USD' }) => {
  const merchantId = process.env.BAKONG_ACCOUNT_ID || 'merchant@bakong';
  const merchantName = process.env.BAKONG_MERCHANT_NAME || 'KhmerShop';
  const city = process.env.BAKONG_CITY || 'Phnom Penh';
  const expiryMinutes = parseInt(process.env.KHQR_QR_EXPIRY_MINUTES) || 15;

  const qrString = buildKHQRString({ merchantId, merchantName, city, amount, currency, orderId });
  const md5Hash = crypto.createHash('md5').update(qrString).digest('hex');

  // Generate QR code as base64
  const qrBase64 = await QRCode.toDataURL(qrString, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
    color: { dark: '#003087', light: '#FFFFFF' }
  });

  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  logger.info(`KHQR generated for order ${orderId}: ${qrString.slice(0, 60)}...`);

  return {
    qrString,
    qrCode: qrBase64,
    md5: md5Hash,
    merchantId,
    expiresAt,
    amount,
    currency,
    orderId
  };
};

/**
 * Verify KHQR payment via Bakong API
 * Uses the md5 of the QR string to check transaction status
 */
const verifyKHQRPayment = async (md5Hash) => {
  try {
    const bakongUrl = process.env.BAKONG_API_URL || 'https://api-bakong.nbc.gov.kh';
    
    // Bakong API: check transaction by MD5 of QR string
    const response = await axios.post(
      `${bakongUrl}/v1/check_transaction_by_md5`,
      { md5: md5Hash },
      {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const data = response.data;
    
    // Response codes: 0 = not found/pending, 1 = success
    if (data?.responseCode === 0 && data?.data) {
      return {
        paid: true,
        transactionId: data.data?.transactionId || md5Hash,
        amount: data.data?.amount,
        currency: data.data?.currency,
        paidAt: new Date()
      };
    }

    return { paid: false };
  } catch (err) {
    logger.warn(`KHQR verification error: ${err.message}`);
    // In dev/test mode, simulate payment after 30 seconds
    if (process.env.NODE_ENV !== 'production') {
      return { paid: false, _devNote: 'Bakong API unavailable in dev mode' };
    }
    return { paid: false };
  }
};

/**
 * Simulate payment (DEV ONLY) — for testing without real Bakong
 */
const simulatePayment = (md5Hash) => {
  return {
    paid: true,
    transactionId: 'SIM-' + md5Hash.slice(0, 16).toUpperCase(),
    amount: null,
    currency: 'USD',
    paidAt: new Date()
  };
};

module.exports = { generateKHQR, verifyKHQRPayment, simulatePayment };
