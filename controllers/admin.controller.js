const Order = require('../models/Order');
const User = require('../models/User');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Review = require('../models/Review');

exports.getDashboard = async (req, res) => {
  const [totalOrders, totalUsers, totalProducts, revenueData] = await Promise.all([
    Order.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    Product.countDocuments({ isActive: true }),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ])
  ]);

  const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dailyRevenue = await Order.aggregate([
    { $match: { paymentStatus: 'paid', paidAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paidAt' } }, revenue: { $sum: '$totalAmount' }, orders: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  const ordersByStatus = await Order.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);

  const topProducts = await Product.find({ isActive: true }).sort({ soldCount: -1 }).limit(5).select('name soldCount price images');
  const recentOrders = await Order.find().sort({ createdAt: -1 }).limit(10).populate('user', 'name email');

  res.json({
    success: true, data: {
      stats: { totalOrders, totalUsers, totalProducts, totalRevenue: revenueData[0]?.total || 0, paidOrders: revenueData[0]?.count || 0 },
      dailyRevenue, ordersByStatus, topProducts, recentOrders
    }
  });
};

exports.getAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status, paymentStatus, search } = req.query;
  const query = {};
  if (status) query.status = status;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (search) query.orderNumber = new RegExp(search, 'i');
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query).populate('user', 'name email phone').sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit));
  res.json({ success: true, total, data: orders });
};

exports.updateOrderStatus = async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  order.status = status;
  order.statusHistory.push({ status, note: note || `Status updated to ${status}`, updatedBy: req.user._id });
  await order.save();

  // Notify customer
  const io = req.app.get('io');
  if (io) io.to(`user:${order.user}`).emit('orderStatusUpdated', { orderId: order._id, status, orderNumber: order.orderNumber });

  res.json({ success: true, data: order });
};

exports.getAllUsers = async (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  const query = { role: role || 'customer' };
  if (search) query.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];
  const total = await User.countDocuments(query);
  const users = await User.find(query).sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit));
  res.json({ success: true, total, data: users });
};

exports.toggleUserStatus = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.isActive = !user.isActive;
  await user.save();
  res.json({ success: true, data: user });
};

exports.moderateReview = async (req, res) => {
  const { isApproved, adminReply } = req.body;
  const review = await Review.findByIdAndUpdate(req.params.id, {
    ...(isApproved !== undefined && { isApproved }),
    ...(adminReply && { adminReply: { text: adminReply, repliedAt: new Date() } })
  }, { new: true });
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
  res.json({ success: true, data: review });
};
