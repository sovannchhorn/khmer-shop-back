const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signAccess = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '15m' });
const signRefresh = (id) => jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

exports.register = async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ success: false, message: 'Email already registered' });
  const user = await User.create({ name, email, password, phone });
  const accessToken = signAccess(user._id);
  const refreshToken = signRefresh(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  res.status(201).json({ success: true, accessToken, refreshToken, data: user });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  if (!user.isActive) return res.status(401).json({ success: false, message: 'Account deactivated' });

  user.lastLogin = new Date();
  const accessToken = signAccess(user._id);
  const refreshToken = signRefresh(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, accessToken, refreshToken, data: user });
};

exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required' });
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    const accessToken = signAccess(user._id);
    const newRefresh = signRefresh(user._id);
    user.refreshToken = newRefresh;
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, accessToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ success: false, message: 'Expired refresh token' });
  }
};

exports.logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.json({ success: true, message: 'Logged out' });
};

exports.getMe = async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist', 'name price images slug');
  res.json({ success: true, data: user });
};

exports.updateProfile = async (req, res) => {
  const { name, phone } = req.body;
  const user = await User.findByIdAndUpdate(req.user._id, { name, phone }, { new: true, runValidators: true });
  res.json({ success: true, data: user });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword)))
    return res.status(400).json({ success: false, message: 'Current password incorrect' });
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed' });
};

// Address management
exports.addAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.isDefault) user.addresses.forEach(a => a.isDefault = false);
  user.addresses.push(req.body);
  await user.save();
  res.json({ success: true, data: user.addresses });
};

exports.updateAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  const addr = user.addresses.id(req.params.addressId);
  if (!addr) return res.status(404).json({ success: false, message: 'Address not found' });
  if (req.body.isDefault) user.addresses.forEach(a => a.isDefault = false);
  Object.assign(addr, req.body);
  await user.save();
  res.json({ success: true, data: user.addresses });
};

exports.deleteAddress = async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.addressId);
  await user.save();
  res.json({ success: true, data: user.addresses });
};
