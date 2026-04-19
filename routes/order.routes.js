const router = require('express').Router();
const ctrl = require('../controllers/order.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/', ctrl.createOrder);
router.get('/my', ctrl.getMyOrders);
router.get('/:id', ctrl.getOrder);
router.post('/:id/cancel', ctrl.cancelOrder);
module.exports = router;
