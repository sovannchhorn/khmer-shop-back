const router = require('express').Router();
const ctrl = require('../controllers/product.controller');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/', ctrl.getProducts);
router.get('/featured', ctrl.getFeaturedProducts);
router.get('/:slug', ctrl.getProduct);
router.get('/:id/related', ctrl.getRelatedProducts);

router.post('/', protect, authorize('admin'), upload.array('images', 10), ctrl.createProduct);
router.put('/:id', protect, authorize('admin'), ctrl.updateProduct);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteProduct);

module.exports = router;
