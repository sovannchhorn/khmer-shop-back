const router = require('express').Router();
const Category = require('../models/Category');
const { protect, authorize } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const cats = await Category.find({ isActive: true }).populate('parent', 'name slug').sort({ sortOrder: 1 });
  res.json({ success: true, data: cats });
});
router.get('/tree', async (req, res) => {
  const all = await Category.find({ isActive: true }).sort({ sortOrder: 1 });
  const tree = all.filter(c => !c.parent).map(parent => ({
    ...parent.toObject(),
    children: all.filter(c => c.parent?.toString() === parent._id.toString())
  }));
  res.json({ success: true, data: tree });
});
router.post('/', protect, authorize('admin'), async (req, res) => {
  const cat = await Category.create(req.body);
  res.status(201).json({ success: true, data: cat });
});
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const cat = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json({ success: true, data: cat });
});
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  await Category.findByIdAndUpdate(req.params.id, { isActive: false });
  res.json({ success: true, message: 'Category deactivated' });
});
module.exports = router;
