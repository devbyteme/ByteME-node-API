const express = require('express');
const router = express.Router();
const { authenticateToken, requireVendor, optionalAuth } = require('../middleware/auth');

// Import order controller (to be created)
const orderController = require('../controllers/orderController');

// ==================== ORDER ROUTES ====================
// Public routes (optional authentication for customer orders)
router.post('/orders', optionalAuth, orderController.createOrder);
router.get('/orders/:id', optionalAuth, orderController.getOrderById);

// Protected routes (vendor authentication required)
router.get('/orders', authenticateToken, requireVendor, orderController.getAllOrders);
router.put('/orders/:id', authenticateToken, requireVendor, orderController.updateOrder);
router.delete('/orders/:id', authenticateToken, requireVendor, orderController.deleteOrder);
router.patch('/orders/:id/status', authenticateToken, requireVendor, orderController.updateOrderStatus);

// Special routes
router.get('/orders/today', authenticateToken, requireVendor, orderController.getTodayOrders);
router.get('/orders/by-status/:status', authenticateToken, requireVendor, orderController.getOrdersByStatus);
router.get('/orders/by-table/:tableNumber', authenticateToken, requireVendor, orderController.getOrdersByTable);

module.exports = router; 