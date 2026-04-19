const router = require('express').Router();
const Review = require('../models/Review');
const { protect, optionalAuth } = require('../middleware/auth');

router.get('/product/:productId', optionalAuth, async (req, res) => {
  const { page = 1, limit = 10, rating } = req.query;
  const query = { product: req.params.productId, isApproved: true };
  if (rating) query.rating = parseInt(rating);
  const total = await Review.countDocuments(query);
  const reviews = await Review.find(query).populate('user', 'name avatar').sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit));
  const stats = await Review.aggregate([
    { $match: { product: require('mongoose').Types.ObjectId.createFromHexString(req.params.productId), isApproved: true } },
    { $group: { _id: '$rating', count: { $sum: 1 } } }
  ]);
  res.json({ success: true, total, data: reviews, stats });
});

router.post('/', protect, async (req, res) => {
  const existing = await Review.findOne({ product: req.body.product, user: req.user._id });
  if (existing) return res.status(400).json({ success: false, message: 'Already reviewed this product' });
  const review = await Review.create({ ...req.body, user: req.user._id });
  await review.populate('user', 'name avatar');
  res.status(201).json({ success: true, data: review });
});

router.put('/:id', protect, async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
  Object.assign(review, req.body);
  await review.save();
  res.json({ success: true, data: review });
});

router.delete('/:id', protect, async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user._id });
  if (!review) return res.status(404).json({ success: false, message: 'Review not found' });
  await review.deleteOne();
  res.json({ success: true, message: 'Review deleted' });
});

module.exports = router;
