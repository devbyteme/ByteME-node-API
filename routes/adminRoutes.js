const express = require('express');
const router = express.Router();
const {
  registerAdmin,
  loginAdmin,
  getDashboardStats,
  getVendorDashboardStats,
  getRevenueStats,
  getVendorStats,
  getCustomerStats,
  getOrderStats,
  getAllVendorsForAdmin
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

// Public routes
router.post('/auth/admin/register', registerAdmin);
router.post('/auth/admin/login', loginAdmin);

// Protected admin routes
router.get('/admin/dashboard-stats', protect, adminOnly, getDashboardStats);
router.get('/admin/vendor-dashboard-stats/:vendorId', protect, adminOnly, getVendorDashboardStats);
router.get('/admin/revenue-stats', protect, adminOnly, getRevenueStats);
router.get('/admin/vendor-stats', protect, adminOnly, getVendorStats);
router.get('/admin/customer-stats', protect, adminOnly, getCustomerStats);
router.get('/admin/order-stats', protect, adminOnly, getOrderStats);
router.get('/admin/vendors', protect, adminOnly, getAllVendorsForAdmin);

module.exports = router;
