const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: String,
  body: { type: String, required: true },
  images: [String],
  isVerifiedPurchase: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: true },
  helpfulVotes: { type: Number, default: 0 },
  adminReply: { text: String, repliedAt: Date }
}, { timestamps: true });

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, isApproved: 1, rating: -1 });

// Update product ratings after review save/delete
reviewSchema.post('save', updateProductRatings);
reviewSchema.post('deleteOne', updateProductRatings);

async function updateProductRatings(doc) {
  const productId = doc.product || this._conditions?.product;
  if (!productId) return;
  const Product = mongoose.model('Product');
  const result = await mongoose.model('Review').aggregate([
    { $match: { product: productId, isApproved: true } },
    { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  await Product.findByIdAndUpdate(productId, {
    'ratings.average': result[0]?.avgRating?.toFixed(1) || 0,
    'ratings.count': result[0]?.count || 0
  });
}

module.exports = mongoose.model('Review', reviewSchema);
