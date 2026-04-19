const router = require('express').Router();
const ctrl = require('../controllers/admin.controller');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('admin'));
router.get('/dashboard', ctrl.getDashboard);
router.get('/orders', ctrl.getAllOrders);
router.patch('/orders/:id/status', ctrl.updateOrderStatus);
router.get('/users', ctrl.getAllUsers);
router.patch('/users/:id/toggle', ctrl.toggleUserStatus);
router.patch('/reviews/:id', ctrl.moderateReview);
module.exports = router;
