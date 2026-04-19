require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');
  await Promise.all([User.deleteMany(), Category.deleteMany(), Product.deleteMany()]);

  // Users
  const admin = await User.create({ name: 'Admin', email: 'admin@khmershop.com', password: 'admin123', role: 'admin' });
  await User.create({ name: 'John Doe', email: 'customer@khmershop.com', password: 'customer123', role: 'customer' });

  // Categories
  const electronics = await Category.create({ name: 'Electronics', slug: 'electronics', description: 'Latest gadgets' });
  const fashion = await Category.create({ name: 'Fashion', slug: 'fashion', description: 'Trendy clothing' });
  const home = await Category.create({ name: 'Home & Living', slug: 'home-living', description: 'For your home' });

  // Subcategories
  const phones = await Category.create({ name: 'Phones', slug: 'phones', parent: electronics._id });
  const laptops = await Category.create({ name: 'Laptops', slug: 'laptops', parent: electronics._id });

  // Products
  const products = [
    { name: 'iPhone 15 Pro Max', slug: 'iphone-15-pro-max', description: 'The most advanced iPhone ever with A17 Pro chip, titanium design, and revolutionary camera system.', price: 1199.99, comparePrice: 1299.99, category: phones._id, stock: 50, brand: 'Apple', isFeatured: true, images: [{ url: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600', alt: 'iPhone 15 Pro Max', isPrimary: true }], tags: ['iphone', 'apple', 'smartphone'], createdBy: admin._id },
    { name: 'Samsung Galaxy S24 Ultra', slug: 'samsung-s24-ultra', description: 'Flagship Android phone with S Pen, 200MP camera, and AI-powered features.', price: 1099.99, comparePrice: 1199.99, category: phones._id, stock: 30, brand: 'Samsung', isFeatured: true, images: [{ url: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600', alt: 'Samsung S24', isPrimary: true }], tags: ['samsung', 'android', 'smartphone'], createdBy: admin._id },
    { name: 'MacBook Pro 14" M3', slug: 'macbook-pro-m3', description: 'Supercharged by M3 chip family. Professional performance, stunning display.', price: 1999.00, comparePrice: 2199.00, category: laptops._id, stock: 20, brand: 'Apple', isFeatured: true, images: [{ url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600', alt: 'MacBook Pro', isPrimary: true }], tags: ['macbook', 'apple', 'laptop'], createdBy: admin._id },
    { name: 'Nike Air Max 270', slug: 'nike-air-max-270', description: 'Inspired by two of Nike biggest icons, the Air Max 270 features the biggest heel Air unit yet.', price: 129.99, comparePrice: 160.00, category: fashion._id, stock: 100, brand: 'Nike', images: [{ url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600', alt: 'Nike Air Max', isPrimary: true }], tags: ['nike', 'shoes', 'sneakers'], createdBy: admin._id },
    { name: 'Minimalist Desk Lamp', slug: 'minimalist-desk-lamp', description: 'LED desk lamp with wireless charging base and adjustable brightness.', price: 69.99, comparePrice: 89.99, category: home._id, stock: 75, brand: 'Lumio', images: [{ url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600', alt: 'Desk Lamp', isPrimary: true }], tags: ['lamp', 'desk', 'led'], createdBy: admin._id },
    { name: 'Sony WH-1000XM5 Headphones', slug: 'sony-wh1000xm5', description: 'Industry-leading noise canceling with two processors and Auto NC Optimizer.', price: 349.99, comparePrice: 399.99, category: electronics._id, stock: 40, brand: 'Sony', isFeatured: true, images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600', alt: 'Sony Headphones', isPrimary: true }], tags: ['sony', 'headphones', 'noise-canceling'], createdBy: admin._id }
  ];

  await Product.insertMany(products);

  console.log('\n✅ Seed data inserted!');
  console.log('📧 Admin: admin@khmershop.com / admin123');
  console.log('📧 Customer: customer@khmershop.com / customer123');
  process.exit(0);
};

seed().catch(e => { console.error(e); process.exit(1); });
