const Product = require('../models/Product');
const Category = require('../models/Category');

exports.getProducts = async (req, res) => {
  const { category, search, minPrice, maxPrice, sort = '-createdAt', page = 1, limit = 12, featured, brand, rating } = req.query;
  const query = { isActive: true };

  if (category) {
    const cat = await Category.findOne({ slug: category });
    if (cat) {
      const children = await Category.find({ parent: cat._id }).select('_id');
      query.category = { $in: [cat._id, ...children.map(c => c._id)] };
    }
  }
  if (search) query.$text = { $search: search };
  if (minPrice || maxPrice) { query.price = {}; if (minPrice) query.price.$gte = parseFloat(minPrice); if (maxPrice) query.price.$lte = parseFloat(maxPrice); }
  if (featured === 'true') query.isFeatured = true;
  if (brand) query.brand = new RegExp(brand, 'i');
  if (rating) query['ratings.average'] = { $gte: parseFloat(rating) };

  const sortMap = { price_asc: 'price', price_desc: '-price', newest: '-createdAt', popular: '-soldCount', rating: '-ratings.average' };
  const sortStr = sortMap[sort] || sort;

  const total = await Product.countDocuments(query);
  const products = await Product.find(query)
    .populate('category', 'name slug')
    .sort(sortStr)
    .skip((page - 1) * parseInt(limit))
    .limit(parseInt(limit))
    .select('-__v');

  res.json({ success: true, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), data: products });
};

exports.getProduct = async (req, res) => {
  const product = await Product.findOne({ $or: [{ slug: req.params.slug }, { _id: req.params.slug.match(/^[0-9a-fA-F]{24}$/) ? req.params.slug : null }], isActive: true })
    .populate('category', 'name slug')
    .populate('subCategory', 'name slug')
    .populate('createdBy', 'name');
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, data: product });
};

exports.getFeaturedProducts = async (req, res) => {
  const products = await Product.find({ isFeatured: true, isActive: true }).populate('category', 'name slug').limit(10);
  res.json({ success: true, data: products });
};

exports.createProduct = async (req, res) => {
  const images = req.files?.map((f, i) => ({ url: `/uploads/images/${f.filename}`, alt: req.body.name, isPrimary: i === 0 })) || [];
  const product = await Product.create({ ...req.body, images, createdBy: req.user._id });
  res.status(201).json({ success: true, data: product });
};

exports.updateProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, data: product });
};

exports.deleteProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  res.json({ success: true, message: 'Product deactivated' });
};

exports.getRelatedProducts = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
  const related = await Product.find({ category: product.category, _id: { $ne: product._id }, isActive: true }).limit(6).populate('category', 'name slug');
  res.json({ success: true, data: related });
};
