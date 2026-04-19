const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const { generateKHQR } = require('../services/khqr.service');

exports.createOrder = async (req, res) => {
  const { shipping, paymentMethod, notes } = req.body;
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart || !cart.items.length) return res.status(400).json({ success: false, message: 'Cart is empty' });

  // Validate stock
  for (const item of cart.items) {
    if (!item.product || !item.product.isActive) return res.status(400).json({ success: false, message: `Product unavailable: ${item.product?.name}` });
    if (item.product.stock < item.quantity) return res.status(400).json({ success: false, message: `Insufficient stock: ${item.product.name}` });
  }

  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shippingFee = subtotal >= 50 ? 0 : 3.99;
  const tax = 0;
  const totalAmount = parseFloat((subtotal + shippingFee + tax).toFixed(2));

  const orderItems = cart.items.map(i => ({
    product: i.product._id,
    name: i.product.name,
    image: i.product.images?.[0]?.url,
    quantity: i.quantity,
    price: i.price,
    variant: i.variant,
    totalPrice: i.price * i.quantity
  }));

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shipping: { ...shipping, shippingFee },
    subtotal: parseFloat(subtotal.toFixed(2)),
    shippingFee,
    tax,
    totalAmount,
    paymentMethod,
    notes,
    statusHistory: [{ status: 'pending', note: 'Order created' }]
  });

  // Reduce stock
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.product._id, { $inc: { stock: -item.quantity, soldCount: item.quantity } });
  }

  // Clear cart
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

  let paymentData = null;

  // Generate KHQR if needed
  if (paymentMethod === 'KHQR') {
    const khqr = await generateKHQR({ orderId: order.orderNumber, amount: totalAmount, currency: 'USD' });
    const payment = await Payment.create({
      order: order._id, user: req.user._id, paymentMethod: 'KHQR',
      amount: totalAmount, currency: 'USD',
      khqrData: { qrCode: khqr.qrCode, qrString: khqr.qrString, md5: khqr.md5, merchantId: khqr.merchantId, expiresAt: khqr.expiresAt }
    });
    paymentData = { paymentId: payment._id, qrCode: khqr.qrCode, qrString: khqr.qrString, amount: totalAmount, currency: 'USD', expiresAt: khqr.expiresAt };
  }

  // Real-time: notify admin
  const io = req.app.get('io');
  if (io) io.to('admin').emit('newOrder', { orderId: order._id, orderNumber: order.orderNumber, amount: totalAmount });

  res.status(201).json({ success: true, data: { order, payment: paymentData } });
};

exports.getMyOrders = async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const query = { user: req.user._id };
  if (status) query.status = status;
  const total = await Order.countDocuments(query);
  const orders = await Order.find(query).sort({ createdAt: -1 }).skip((page-1)*parseInt(limit)).limit(parseInt(limit));
  res.json({ success: true, total, data: orders });
};

exports.getOrder = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  const payment = await Payment.findOne({ order: order._id });
  res.json({ success: true, data: { order, payment } });
};

exports.cancelOrder = async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (!['pending','confirmed'].includes(order.status)) return res.status(400).json({ success: false, message: 'Cannot cancel this order' });

  // Restore stock
  for (const item of order.items) {
    await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity, soldCount: -item.quantity } });
  }

  order.status = 'cancelled';
  order.statusHistory.push({ status: 'cancelled', note: 'Cancelled by customer', updatedBy: req.user._id });
  await order.save();
  res.json({ success: true, data: order });
};
