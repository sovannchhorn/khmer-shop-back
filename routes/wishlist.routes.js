const router = require('express').Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', async (req, res) => {
  const user = await User.findById(req.user._id).populate('wishlist', 'name price images slug ratings');
  res.json({ success: true, data: user.wishlist });
});
router.post('/:productId', async (req, res) => {
  const user = await User.findById(req.user._id);
  const idx = user.wishlist.indexOf(req.params.productId);
  if (idx > -1) { user.wishlist.splice(idx, 1); await user.save(); return res.json({ success: true, added: false, message: 'Removed from wishlist' }); }
  user.wishlist.push(req.params.productId);
  await user.save();
  res.json({ success: true, added: true, message: 'Added to wishlist' });
});
module.exports = router;
