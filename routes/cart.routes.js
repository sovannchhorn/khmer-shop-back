const router = require('express').Router();
const ctrl = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getCart);
router.post('/add', ctrl.addToCart);
router.put('/item/:itemId', ctrl.updateCartItem);
router.delete('/item/:itemId', ctrl.removeFromCart);
router.delete('/', ctrl.clearCart);
module.exports = router;
