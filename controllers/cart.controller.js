const Cart = require('../models/Cart');
const Product = require('../models/Product');

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
};

exports.getCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product', 'name price images stock slug isActive');
  if (!cart) return res.json({ success: true, data: { items: [], subtotal: 0, totalItems: 0 } });
  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  res.json({ success: true, data: { items: cart.items, subtotal: parseFloat(subtotal.toFixed(2)), totalItems: cart.items.reduce((s, i) => s + i.quantity, 0), coupon: cart.coupon } });
};

exports.addToCart = async (req, res) => {
  const { productId, quantity = 1, variant } = req.body;
  const product = await Product.findById(productId);
  if (!product || !product.isActive) return res.status(404).json({ success: false, message: 'Product not found' });
  if (product.stock < quantity) return res.status(400).json({ success: false, message: 'Insufficient stock' });

  const cart = await getOrCreateCart(req.user._id);
  const existing = cart.items.find(i => i.product.toString() === productId && JSON.stringify(i.variant) === JSON.stringify(variant));

  if (existing) {
    if (product.stock < existing.quantity + quantity) return res.status(400).json({ success: false, message: 'Max stock reached' });
    existing.quantity += quantity;
  } else {
    cart.items.push({ product: productId, quantity, price: product.price, variant, totalPrice: product.price * quantity });
  }

  await cart.save();
  await cart.populate('items.product', 'name price images stock slug');
  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  res.json({ success: true, data: { items: cart.items, subtotal: parseFloat(subtotal.toFixed(2)), totalItems: cart.items.reduce((s, i) => s + i.quantity, 0) } });
};

exports.updateCartItem = async (req, res) => {
  const { quantity } = req.body;
  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ success: false, message: 'Item not in cart' });

  const product = await Product.findById(item.product);
  if (quantity > product.stock) return res.status(400).json({ success: false, message: 'Insufficient stock' });

  if (quantity <= 0) {
    cart.items = cart.items.filter(i => i._id.toString() !== req.params.itemId);
  } else {
    item.quantity = quantity;
  }

  await cart.save();
  await cart.populate('items.product', 'name price images stock slug');
  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  res.json({ success: true, data: { items: cart.items, subtotal: parseFloat(subtotal.toFixed(2)), totalItems: cart.items.reduce((s, i) => s + i.quantity, 0) } });
};

exports.removeFromCart = async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = cart.items.filter(i => i._id.toString() !== req.params.itemId);
  await cart.save();
  res.json({ success: true, message: 'Item removed', data: { items: cart.items, totalItems: cart.items.reduce((s, i) => s + i.quantity, 0) } });
};

exports.clearCart = async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
  res.json({ success: true, message: 'Cart cleared' });
};
