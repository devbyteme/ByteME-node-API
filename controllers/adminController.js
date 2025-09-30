const GeneralAdmin = require('../models/GeneralAdmin');
const MultiVendorAdmin = require('../models/MultiVendorAdmin');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const VendorAccess = require('../models/VendorAccess');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { sendAdminWelcomeEmail } = require('../services/emailService');

// Non-blocking email helper function
const sendEmailAsync = async (emailFunction, ...args) => {
  setImmediate(async () => {
    try {
      await emailFunction(...args);
      console.log('Email sent successfully');
    } catch (error) {
      console.error('Email sending failed (non-blocking):', error.message);
      // Don't throw error - just log it
    }
  });
};

// Generate JWT token for admin
const generateAdminToken = (admin, roleOverride) => {
  return jwt.sign(
    { 
      id: admin._id, 
      email: admin.email, 
      role: roleOverride || admin.role || 'general_admin',
      userType: 'admin'
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Helper function to get vendor IDs for multi-vendor admin
const getVendorIdsForAdmin = async (adminEmail) => {
  const vendorAccess = await VendorAccess.find({
    userEmail: String(adminEmail).toLowerCase(),
    status: 'active'
  }).select('vendorId');
  // Ensure we always return ObjectId instances
  return vendorAccess
    .map(a => a.vendorId)
    .filter(Boolean)
    .map(id => (id instanceof mongoose.Types.ObjectId ? id : new mongoose.Types.ObjectId(String(id))));
};

// @desc    Login multi-vendor admin
// @route   POST /api/auth/admin/multi-vendor-login
// @access  Public
const loginMultiVendorAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await MultiVendorAdmin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if admin is multi-vendor admin
    // role implied by collection

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      await admin.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Ensure any pending invites for this admin are activated on first login
    await VendorAccess.updateMany(
      { userEmail: admin.email.toLowerCase(), status: 'pending' },
      { $set: { status: 'active', acceptedAt: new Date() } }
    );

    // Check if user has any vendor access (active)
    const vendorAccess = await VendorAccess.find({ 
      userEmail: admin.email.toLowerCase(), 
      status: { $in: ['active'] }
    }).populate('vendorId');
    
    if (vendorAccess.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'No vendor access granted. Please contact a vendor to grant you access.'
      });
    }

    // Reset login attempts on successful login
    if (admin.loginAttempts > 0) {
      await admin.resetLoginAttempts();
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = generateAdminToken(admin, 'multi_vendor_admin');

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: admin.getPublicProfile()
    });

  } catch (error) {
    console.error('Error logging in multi-vendor admin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Register multi-vendor admin
// @route   POST /api/auth/admin/multi-vendor-register
// @access  Public (with access token)
const registerMultiVendorAdmin = async (req, res) => {
  try {
    const { name, email, password, accessToken } = req.body;

    // Validate required fields
    if (!name || !email || !password || !accessToken) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Normalize email for matching
    const normalizedEmail = String(email).toLowerCase();

    // Find and verify the vendor access (by token primarily)
    const vendorAccess = await VendorAccess.findOne({ 
      accessToken
    }).populate('vendorId');

    if (!vendorAccess) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired access token'
      });
    }

    // Check email and state
    if (vendorAccess.userEmail.toLowerCase() !== normalizedEmail) {
      return res.status(400).json({ success: false, message: 'This invite was sent to a different email.' });
    }

    // Check if access token has expired
    if (vendorAccess.expiresAt && vendorAccess.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Access token has expired'
      });
    }
    if (vendorAccess.status === 'revoked') {
      return res.status(400).json({ success: false, message: 'Access was revoked by the vendor.' });
    }

    // Check if admin already exists
    const existingAdmin = await MultiVendorAdmin.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Create new multi-vendor admin
    const admin = new MultiVendorAdmin({
      name,
      email: normalizedEmail,
      password,
    });

    await admin.save();

    // Update vendor access status to active and consume token
    vendorAccess.status = 'active';
    vendorAccess.acceptedAt = new Date();
    vendorAccess.userName = name;
    vendorAccess.accessToken = undefined;
    await vendorAccess.save();

    // Send welcome email (non-blocking)
    sendEmailAsync(sendAdminWelcomeEmail, admin.email, admin.name);

    res.status(201).json({
      success: true,
      message: 'Multi-vendor admin account created successfully',
      user: admin.getPublicProfile()
    });

  } catch (error) {
    console.error('Error registering multi-vendor admin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Register admin
// @route   POST /api/auth/admin/register
// @access  Public (with admin code)
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, adminCode } = req.body;

    // Validate admin code
    const validAdminCode = process.env.ADMIN_REGISTRATION_CODE || 'BYTEME_ADMIN_2024';
    if (adminCode !== validAdminCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin registration code'
      });
    }

    // Check if admin already exists
    const existingAdmin = await GeneralAdmin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Create new general admin
    const admin = new GeneralAdmin({
      name,
      email,
      password,
    });

    await admin.save();

    // Send welcome email (non-blocking)
    sendEmailAsync(sendAdminWelcomeEmail, admin.email, admin.name);

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: admin.getPublicProfile()
    });

  } catch (error) {
    console.error('Error registering admin:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Login admin
// @route   POST /api/auth/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await GeneralAdmin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // explicit role for token

    // Check password
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      await admin.incLoginAttempts();
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    if (admin.loginAttempts > 0) {
      await admin.resetLoginAttempts();
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = generateAdminToken(admin, 'general_admin');

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: admin.getPublicProfile()
    });

  } catch (error) {
    console.error('Error logging in admin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard-stats
// @access  Private (Admin)
const getDashboardStats = async (req, res) => {
  try {
    const adminEmail = req.user.email;
    const adminRole = req.user.role;
    
    // For multi-vendor admins, only show data for vendors they have access to
    let vendorFilter = {};
    let orderFilter = {};
    
    if (adminRole === 'multi_vendor_admin') {
      const vendorIds = await getVendorIdsForAdmin(adminEmail);
      vendorFilter = { _id: { $in: vendorIds }, isActive: true };
      orderFilter = { vendorId: { $in: vendorIds } };
    } else {
      // General admins see all data
      vendorFilter = { isActive: true };
    }

    // Get counts
    const [totalVendors, totalCustomers, totalOrders] = await Promise.all([
      Vendor.countDocuments(vendorFilter),
      User.countDocuments({ isActive: true }), // Customers are global
      Order.countDocuments(orderFilter)
    ]);

    console.log('Basic counts:', { totalVendors, totalCustomers, totalOrders });

    // Check order payment statuses
    const orderStatusPipeline = [];
    if (Object.keys(orderFilter).length > 0) {
      orderStatusPipeline.push({ $match: orderFilter });
    }
    orderStatusPipeline.push({
      $group: {
        _id: '$paymentStatus',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    });
    
    const orderStatusCounts = await Order.aggregate(orderStatusPipeline);
    console.log('Order payment status counts:', orderStatusCounts);

    // Calculate total revenue
    console.log('Calculating total revenue...');
    const revenuePipeline = [];
    if (Object.keys(orderFilter).length > 0) {
      revenuePipeline.push({ $match: orderFilter });
    }
    revenuePipeline.push({ $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } });
    
    const revenueResult = await Order.aggregate(revenuePipeline);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;
    console.log('Revenue aggregation result:', revenueResult);
    console.log('Total revenue calculated:', totalRevenue);

    // Also calculate paid revenue for comparison
    const paidRevenuePipeline = [];
    if (Object.keys(orderFilter).length > 0) {
      paidRevenuePipeline.push({ $match: { ...orderFilter, paymentStatus: 'paid' } });
    } else {
      paidRevenuePipeline.push({ $match: { paymentStatus: 'paid' } });
    }
    paidRevenuePipeline.push({ $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } });
    
    const paidRevenueResult = await Order.aggregate(paidRevenuePipeline);
    const paidRevenue = paidRevenueResult.length > 0 ? paidRevenueResult[0].totalRevenue : 0;
    console.log('Paid revenue calculated:', paidRevenue);

    // Get growth data (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [
      recentVendors,
      previousVendors,
      recentCustomers,
      previousCustomers,
      recentOrders,
      previousOrders
    ] = await Promise.all([
      Vendor.countDocuments({ ...vendorFilter, createdAt: { $gte: thirtyDaysAgo } }),
      Vendor.countDocuments({ ...vendorFilter, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }),
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }), // Customers are global
      User.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } }), // Customers are global
      Order.countDocuments({ ...orderFilter, createdAt: { $gte: thirtyDaysAgo } }),
      Order.countDocuments({ ...orderFilter, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } })
    ]);

    // Calculate revenue growth (last 30 days vs previous 30 days)
    const recentRevenuePipeline = [];
    const previousRevenuePipeline = [];
    
    if (Object.keys(orderFilter).length > 0) {
      recentRevenuePipeline.push({ $match: { ...orderFilter, createdAt: { $gte: thirtyDaysAgo } } });
      previousRevenuePipeline.push({ $match: { ...orderFilter, createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } });
    } else {
      recentRevenuePipeline.push({ $match: { createdAt: { $gte: thirtyDaysAgo } } });
      previousRevenuePipeline.push({ $match: { createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } } });
    }
    
    recentRevenuePipeline.push({ $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } });
    previousRevenuePipeline.push({ $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } });
    
    const [recentRevenue, previousRevenue] = await Promise.all([
      Order.aggregate(recentRevenuePipeline),
      Order.aggregate(previousRevenuePipeline)
    ]);

    const recentRevenueAmount = recentRevenue.length > 0 ? recentRevenue[0].totalRevenue : 0;
    const previousRevenueAmount = previousRevenue.length > 0 ? previousRevenue[0].totalRevenue : 0;
    const revenueGrowth = previousRevenueAmount > 0 ? ((recentRevenueAmount - previousRevenueAmount) / previousRevenueAmount * 100) : 0;

    // Calculate growth percentages
    const vendorGrowth = previousVendors > 0 ? ((recentVendors - previousVendors) / previousVendors * 100) : 0;
    const customerGrowth = previousCustomers > 0 ? ((recentCustomers - previousCustomers) / previousCustomers * 100) : 0;
    const orderGrowth = previousOrders > 0 ? ((recentOrders - previousOrders) / previousOrders * 100) : 0;

    const dashboardData = {
      totalVendors,
      totalCustomers,
      totalOrders,
      totalRevenue,
      growth: {
        vendors: Math.round(vendorGrowth * 100) / 100,
        customers: Math.round(customerGrowth * 100) / 100,
        orders: Math.round(orderGrowth * 100) / 100,
        revenue: Math.round(revenueGrowth * 100) / 100
      }
    };

    console.log('Admin Dashboard Stats:', dashboardData);

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get revenue statistics
// @route   GET /api/admin/revenue-stats
// @access  Private (Admin)
const getRevenueStats = async (req, res) => {
  try {
    const { period = '7d', vendorId } = req.query;
    const adminEmail = req.user.email;
    const adminRole = req.user.role;
    
    let days;
    switch (period) {
      case '7d':
        days = 7;
        break;
      case '30d':
        days = 30;
        break;
      case '90d':
        days = 90;
        break;
      default:
        days = 7;
    }

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Build match criteria
    const matchCriteria = { createdAt: { $gte: startDate } };

    if (vendorId && vendorId !== 'all') {
      matchCriteria.vendorId = new mongoose.Types.ObjectId(vendorId);
    } else if (adminRole === 'multi_vendor_admin') {
      const vendorIds = await getVendorIdsForAdmin(adminEmail);
      matchCriteria.vendorId = { $in: vendorIds };
    }

    const revenueData = await Order.aggregate([
      { $match: matchCriteria },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Fill in missing dates with zero values
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const existingData = revenueData.find(d => d._id === dateString);
      result.push({
        date: dateString,
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: existingData ? existingData.revenue : 0,
        orders: existingData ? existingData.orders : 0
      });
    }

    console.log('Revenue Stats Query:', { period, vendorId, days, startDate });
    console.log('Revenue Stats Result:', result);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error getting revenue stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// Helper function to get date range based on period
const getDateRange = (period) => {
  const now = new Date();
  let startDate;

  switch (period) {
    case '1d':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1 day ago
      break;
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days ago
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Default to 7 days
  }

  return { startDate, endDate: now };
};

// @desc    Get vendor statistics
// @route   GET /api/admin/vendor-stats
// @access  Private (Admin)
const getVendorStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const { startDate } = getDateRange(period);

    // Get total vendor stats
    const stats = await Vendor.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$isActive', true] }, 1, 0]
            }
          },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    // Get vendors created in the specified period
    const newVendors = await Vendor.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Get cuisine distribution
    const cuisineStats = await Vendor.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$cuisine',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get vendor activity in the period (vendors with orders)
    const activeVendorsInPeriod = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$vendorId'
        }
      },
      {
        $count: 'activeVendors'
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          ...(stats[0] || { total: 0, active: 0, avgRating: 0 }),
          newInPeriod: newVendors,
          activeInPeriod: activeVendorsInPeriod[0]?.activeVendors || 0
        },
        cuisineDistribution: cuisineStats,
        period
      }
    });

  } catch (error) {
    console.error('Error getting vendor stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get customer statistics
// @route   GET /api/admin/customer-stats
// @access  Private (Admin)
const getCustomerStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const { startDate } = getDateRange(period);

    // Get total customer stats
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $eq: ['$isActive', true] }, 1, 0]
            }
          },
          verified: {
            $sum: {
              $cond: [{ $eq: ['$isEmailVerified', true] }, 1, 0]
            }
          }
        }
      }
    ]);

    // Get customers created in the specified period
    const newCustomers = await User.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Get customers who placed orders in the period
    const activeCustomersInPeriod = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          customerId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$customerId'
        }
      },
      {
        $count: 'activeCustomers'
      }
    ]);

    // Get customers who logged in during the period
    const loggedInCustomers = await User.countDocuments({
      lastLogin: { $gte: startDate }
    });

    res.json({
      success: true,
      data: {
        ...(stats[0] || { total: 0, active: 0, verified: 0 }),
        newInPeriod: newCustomers,
        activeInPeriod: activeCustomersInPeriod[0]?.activeCustomers || 0,
        loggedInPeriod: loggedInCustomers,
        period
      }
    });

  } catch (error) {
    console.error('Error getting customer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get order statistics
// @route   GET /api/admin/order-stats
// @access  Private (Admin)
const getOrderStats = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const { startDate } = getDateRange(period);

    // Get order stats by status for all time
    const statusStats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get order stats for the specified period
    const periodStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get order stats by status for the period
    const periodStatusStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get payment method distribution for the period
    const paymentMethodStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        allTime: {
          byStatus: statusStats
        },
        period: {
          overview: periodStats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 },
          byStatus: periodStatusStats,
          byPaymentMethod: paymentMethodStats,
          periodLabel: period
        }
      }
    });

  } catch (error) {
    console.error('Error getting order stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get vendor-specific dashboard statistics
// @route   GET /api/admin/vendor-dashboard-stats/:vendorId
// @access  Private (Admin)
const getVendorDashboardStats = async (req, res) => {
  try {
    const { vendorId } = req.params;
    
    if (!vendorId || vendorId === 'all') {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    // Validate vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Get vendor-specific counts
    const [totalOrders, totalRevenue] = await Promise.all([
      Order.countDocuments({ vendorId: new mongoose.Types.ObjectId(vendorId) }),
      Order.aggregate([
        { $match: { vendorId: new mongoose.Types.ObjectId(vendorId) } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
      ])
    ]);

    const revenue = totalRevenue.length > 0 ? totalRevenue[0].totalRevenue : 0;

    // Get growth data (last 30 days vs previous 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [recentOrders, previousOrders] = await Promise.all([
      Order.countDocuments({ 
        vendorId: new mongoose.Types.ObjectId(vendorId),
        createdAt: { $gte: thirtyDaysAgo }
      }),
      Order.countDocuments({ 
        vendorId: new mongoose.Types.ObjectId(vendorId),
        createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
      })
    ]);

    // Calculate revenue growth
    const [recentRevenue, previousRevenue] = await Promise.all([
      Order.aggregate([
        { 
          $match: { 
            vendorId: new mongoose.Types.ObjectId(vendorId),
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
      ]),
      Order.aggregate([
        { 
          $match: { 
            vendorId: new mongoose.Types.ObjectId(vendorId),
            createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
          }
        },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
      ])
    ]);

    const recentRevenueAmount = recentRevenue.length > 0 ? recentRevenue[0].totalRevenue : 0;
    const previousRevenueAmount = previousRevenue.length > 0 ? previousRevenue[0].totalRevenue : 0;
    const revenueGrowth = previousRevenueAmount > 0 ? ((recentRevenueAmount - previousRevenueAmount) / previousRevenueAmount * 100) : 0;

    // Calculate growth percentages
    const orderGrowth = previousOrders > 0 ? ((recentOrders - previousOrders) / previousOrders * 100) : 0;

    const vendorStats = {
      vendorId,
      vendorName: vendor.name,
      totalOrders,
      totalRevenue: revenue,
      growth: {
        orders: Math.round(orderGrowth * 100) / 100,
        revenue: Math.round(revenueGrowth * 100) / 100
      }
    };

    console.log('Vendor Dashboard Stats:', vendorStats);

    res.json({
      success: true,
      data: vendorStats
    });

  } catch (error) {
    console.error('Error getting vendor dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get all vendors for dropdown
// @route   GET /api/admin/vendors
// @access  Private (Admin)
const getAllVendorsForAdmin = async (req, res) => {
  try {
    const adminEmail = req.user.email;
    const adminRole = req.user.role;
    
    let vendorFilter = { isActive: true };
    
    // For multi-vendor admins, only show vendors they have access to
    if (adminRole === 'multi_vendor_admin') {
      const vendorIds = await getVendorIdsForAdmin(adminEmail);
      vendorFilter = { _id: { $in: vendorIds }, isActive: true };
    }
    
    const vendors = await Vendor.find(vendorFilter)
      .select('_id name email cuisine location')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: vendors
    });

  } catch (error) {
    console.error('Error getting vendors for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get orders for admin (filtered by role/access)
// @route   GET /api/admin/orders
// @access  Private (Admin)
const getAdminOrders = async (req, res) => {
  try {
    const adminEmail = req.user.email;
    const adminRole = req.user.role;
    const { vendorId, period = '30d' } = req.query;

    // Resolve days
    let days = 30;
    if (period === '7d') days = 7; else if (period === '90d') days = 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Build filter
    let match = { createdAt: { $gte: startDate } };
    if (vendorId && vendorId !== 'all') {
      match.vendorId = new mongoose.Types.ObjectId(vendorId);
    } else if (adminRole === 'multi_vendor_admin') {
      const vendorIds = await getVendorIdsForAdmin(adminEmail);
      match.vendorId = { $in: vendorIds };
    }

    const orders = await Order.find(match)
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data: orders });
  } catch (error) {
    console.error('Error getting admin orders:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get customers for admin (join orders -> users by customerId)
// @route   GET /api/admin/customers
// @access  Private (Admin)
const getAdminCustomers = async (req, res) => {
  try {
    const adminEmail = req.user.email;
    const adminRole = req.user.role;
    const { vendorId, period = '30d' } = req.query;

    let days = 30;
    if (period === '7d') days = 7; else if (period === '90d') days = 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Build match criteria from access
    const match = { createdAt: { $gte: startDate } };
    if (vendorId && vendorId !== 'all') {
      match.vendorId = new mongoose.Types.ObjectId(vendorId);
    } else if (adminRole === 'multi_vendor_admin') {
      const vendorIds = await getVendorIdsForAdmin(adminEmail);
      match.vendorId = { $in: vendorIds };
    }

    // 1) Aggregate orders by customerId to compute stats
    const orderAgg = await Order.aggregate([
      { $match: { ...match, customerId: { $ne: null } } },
      {
        $group: {
          _id: '$customerId',
          ordersCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          lastOrderAt: { $max: '$createdAt' }
        }
      },
      { $sort: { lastOrderAt: -1 } },
      { $limit: 200 }
    ]);

    const customerIds = orderAgg.map(r => r._id).filter(Boolean);

    // 2) Fetch user records for these customerIds
    const users = await User.find({ _id: { $in: customerIds } })
      .select('_id email firstName lastName')
      .lean();
    const userById = new Map(users.map(u => [String(u._id), u]));

    // 3) Join aggregated stats with user data
    const customers = orderAgg.map(r => {
      const user = userById.get(String(r._id));
      return {
        email: user?.email || 'unknown',
        ordersCount: r.ordersCount,
        totalSpent: r.totalSpent,
        lastOrderAt: r.lastOrderAt,
        customerId: r._id,
        name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : undefined
      };
    });

    res.json({ success: true, data: customers });
  } catch (error) {
    console.error('Error getting admin customers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  loginMultiVendorAdmin,
  registerMultiVendorAdmin,
  getDashboardStats,
  getVendorDashboardStats,
  getRevenueStats,
  getVendorStats,
  getCustomerStats,
  getOrderStats,
  getAllVendorsForAdmin,
  getAdminOrders,
  getAdminCustomers
};
