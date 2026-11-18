const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const articleRoutes = require('./routes/articleRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const adminRoutes = require('./routes/adminRoutes');
const tagRoutes = require('./routes/tagRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// 1. Security HTTP Headers
app.use(helmet());

// 2. Cross-Origin Resource Sharing (CORS) based on CLIENT_URL
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5500';
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or Postman) or matching CLIENT_URL
    if (!origin || origin === clientUrl || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked request from origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// 3. Request Logging with Morgan
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// 4. Request Body Parsers & Cookie Parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 5. Static File Serving with security headers
app.use('/uploads', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
}, express.static(path.join(__dirname, '..', 'uploads')));

// 6. API Routing
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tags', tagRoutes);

// Security Guard: Prevent exposure of sensitive config and environment files
app.use((req, res, next) => {
  if (
    req.path.startsWith('/.env') ||
    req.path.includes('.env') ||
    req.path === '/package.json' ||
    req.path === '/package-lock.json'
  ) {
    return res.status(403).json({ success: false, message: 'Access forbidden' });
  }
  next();
});

// 7. Static Frontend Application Files (Protected from serving .env or hidden files)
app.use(
  express.static(path.join(__dirname, '..'), {
    dotfiles: 'ignore',
    index: 'index.html',
  })
);

// 8. 404 Unknown Route Handling
app.use(notFound);

// 9. Centralized Error Handling
app.use(errorHandler);

module.exports = app;
