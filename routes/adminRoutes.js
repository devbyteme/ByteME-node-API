const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

// Public routes
router.post('/auth/admin/register', registerAdmin);
router.post('/auth/admin/login', loginAdmin);
router.post('/auth/admin/multi-vendor-login', loginMultiVendorAdmin);
router.post('/auth/admin/multi-vendor-register', registerMultiVendorAdmin);

// Protected admin routes
router.get('/admin/dashboard-stats', protect, adminOnly, getDashboardStats);
router.get('/admin/vendor-dashboard-stats/:vendorId', protect, adminOnly, getVendorDashboardStats);
router.get('/admin/revenue-stats', protect, adminOnly, getRevenueStats);
router.get('/admin/vendor-stats', protect, adminOnly, getVendorStats);
router.get('/admin/customer-stats', protect, adminOnly, getCustomerStats);
router.get('/admin/order-stats', protect, adminOnly, getOrderStats);
router.get('/admin/vendors', protect, adminOnly, getAllVendorsForAdmin);
router.get('/admin/orders', protect, adminOnly, getAdminOrders);
router.get('/admin/customers', protect, adminOnly, getAdminCustomers);

module.exports = router;
