require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes = require('./routes/cart.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const reviewRoutes = require('./routes/review.routes');
const adminRoutes = require('./routes/admin.routes');
const wishlistRoutes = require('./routes/wishlist.routes');

const app = express();

// Connect to MongoDB (cached for serverless)
connectDB();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  message: { success: false, message: 'Too many requests' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many auth attempts' }
});
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// CORS
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:4200').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

// Logging (skip in serverless to reduce noise)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Static uploads (only works on traditional server, not Vercel)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'KhmerShop API Docs'
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date(), env: process.env.NODE_ENV, version: '1.0.0' });
});

// Root
app.get('/', (req, res) => {
  res.json({ message: '🛍️ KhmerShop API', docs: '/api/docs', health: '/api/health' });
});

// Error handler
app.use(errorHandler);

// ─── Start server (only when NOT on Vercel) ───────────────────────────────────
const isVercel = process.env.VERCEL || process.env.NOW_REGION;

if (!isVercel) {
  const http = require('http');
  const server = http.createServer(app);

  // Socket.io (only in traditional server mode)
  try {
    const initSocket = require('./config/socket');
    const io = initSocket(server);
    app.set('io', io);
  } catch (e) {
    logger.warn('Socket.io init skipped');
  }

  // KHQR expiry cron (only in traditional server mode)
  try {
    const { scheduleKHQRExpiry } = require('./jobs/khqrExpiry');
    scheduleKHQRExpiry();
  } catch (e) {
    logger.warn('KHQR cron skipped');
  }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    logger.info(`🚀 KhmerShop API running on port ${PORT}`);
    logger.info(`📖 Swagger: http://localhost:${PORT}/api/docs`);
  });
}

// Export for Vercel serverless
module.exports = app;
