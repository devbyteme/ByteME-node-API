const express = require('express');
const cors = require('cors');
const session = require('express-session');
const connectDB = require('./config/database');
const { passport } = require('./config/passport');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Middleware
// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000']; // Default fallback

  app.use(cors({
    origin: true, // Allow all origins
    credentials: true
  }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/vendors', require('./routes/vendorRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api', require('./routes/orderRoutes')); // Orders are at root level
app.use('/api', require('./routes/tableRoutes')); // Tables are at root level
app.use('/api', require('./routes/adminRoutes')); // Admin routes
app.use('/api/vendor-access', require('./routes/vendorAccessRoutes')); // Vendor access management

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'ByteMe Node API is running!',
    version: '1.0.0',
    endpoints: {
      auth: {
        vendorRegistration: '/api/auth/vendor/register',
        vendorLogin: '/api/auth/vendor/login',
        googleAuth: '/api/auth/google',
        userRegistration: '/api/auth/user/register',
        userLogin: '/api/auth/user/login',
        adminRegistration: '/api/auth/admin/register',
        adminLogin: '/api/auth/admin/login',
        profile: '/api/auth/me',
        changePassword: '/api/auth/change-password',
        forgotPassword: '/api/auth/forgot-password',
        resetPassword: '/api/auth/reset-password',
        logout: '/api/auth/logout',
        refreshToken: '/api/auth/refresh'
      },
      menu: {
        getAllItems: '/api/menu/menu-items',
        getItemById: '/api/menu/menu-items/:id',
        getByCategory: '/api/menu/menu-items/category/:category',
        createItem: '/api/menu/menu-items',
        updateItem: '/api/menu/menu-items/:id',
        deleteItem: '/api/menu/menu-items/:id',
        updateAvailability: '/api/menu/menu-items/:id/availability'
      },
      categories: {
        getCategories: '/api/menu/categories',
        getCategoryById: '/api/menu/categories/:id',
        createCategory: '/api/menu/categories',
        updateCategory: '/api/menu/categories/:id',
        deleteCategory: '/api/menu/categories/:id',
        initializeDefaults: '/api/menu/categories/initialize',
        reorderCategories: '/api/menu/categories/reorder'
      },
      orders: {
        createOrder: '/api/orders',
        getOrderById: '/api/orders/:id',
        getAllOrders: '/api/orders',
        updateOrder: '/api/orders/:id',
        deleteOrder: '/api/orders/:id',
        updateStatus: '/api/orders/:id/status',
        todayOrders: '/api/orders/today',
        byStatus: '/api/orders/by-status/:status',
        byTable: '/api/orders/by-table/:tableNumber'
      },
      tables: {
        getAllTables: '/api/tables',
        getTableById: '/api/tables/:id',
        createTable: '/api/tables',
        updateTable: '/api/tables/:id',
        deleteTable: '/api/tables/:id',
        updateStatus: '/api/tables/:id/status',
        availability: '/api/tables/availability'
      },
      admin: {
        dashboardStats: '/api/admin/dashboard-stats',
        revenueStats: '/api/admin/revenue-stats?period=7d&vendorId=all',
        vendorStats: '/api/admin/vendor-stats',
        customerStats: '/api/admin/customer-stats',
        orderStats: '/api/admin/order-stats',
        vendorsList: '/api/admin/vendors'
      },
      vendors: '/api/vendors',
      users: '/api/users'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  console.log('Environment:', process.env.NODE_ENV || 'development');
  console.log('CORS Origins allowed:', corsOrigins);
});