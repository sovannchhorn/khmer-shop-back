/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: KHQR / Bakong Payment
 */
const router = require('express').Router();
const ctrl = require('../controllers/payment.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/khqr/verify/:paymentId', ctrl.verifyKHQR);
router.get('/status/:orderId', ctrl.getPaymentStatus);
router.post('/khqr/regenerate/:orderId', ctrl.regenerateKHQR);
module.exports = router;
