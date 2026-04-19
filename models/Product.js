const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  options: [{ value: String, stock: { type: Number, default: 0 }, priceModifier: { type: Number, default: 0 } }]
}, { _id: false });

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, required: true },
  shortDescription: String,
  sku: { type: String, unique: true, sparse: true },
  price: { type: Number, required: true, min: 0 },
  comparePrice: Number, // original/strike-through price
  cost: Number,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  images: [{ url: String, alt: String, isPrimary: { type: Boolean, default: false } }],
  variants: [variantSchema],
  stock: { type: Number, required: true, default: 0, min: 0 },
  soldCount: { type: Number, default: 0 },
  tags: [String],
  brand: String,
  weight: Number,
  dimensions: { length: Number, width: Number, height: Number },
  isFeatured: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },
  seoTitle: String,
  seoDescription: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

productSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
  }
  next();
});

productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, price: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ isFeatured: 1, isActive: 1 });
productSchema.index({ 'ratings.average': -1 });

module.exports = mongoose.model('Product', productSchema);
