const router = require('express').Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/order-history', async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const total = await Order.countDocuments({ user: req.user._id });
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit));
  res.json({ success: true, total, data: orders });
});
module.exports = router;
