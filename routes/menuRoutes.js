const express = require('express');
const router = express.Router();
const { authenticateToken, requireVendor } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Import controllers
const menuController = require('../controllers/menuController');
const categoryController = require('../controllers/categoryController');

// ==================== MENU ITEM ROUTES ====================
// Public routes (no authentication required)
router.get('/menu-items', menuController.getAllMenuItems);
router.get('/menu-items/:id', menuController.getMenuItemById);
router.get('/menu-items/category/:category', menuController.getMenuItemsByCategory);

// Protected routes (vendor authentication required)
router.post('/menu-items', authenticateToken, requireVendor,upload.single('image'),menuController.createMenuItem);
router.put('/menu-items/:id', authenticateToken, requireVendor,upload.single('image'),menuController.updateMenuItem);
router.delete('/menu-items/:id', authenticateToken, requireVendor, menuController.deleteMenuItem);
router.patch('/menu-items/:id/availability', authenticateToken, requireVendor, menuController.updateMenuItemAvailability);

// ==================== CATEGORY ROUTES ====================
// All category routes require vendor authentication
router.get('/categories', authenticateToken, requireVendor, categoryController.getCategories);
router.post('/categories/initialize', authenticateToken, requireVendor, categoryController.initializeDefaultCategories);
router.patch('/categories/reorder', authenticateToken, requireVendor, categoryController.reorderCategories);
router.get('/categories/:id', authenticateToken, requireVendor, categoryController.getCategoryById);
router.post('/categories', authenticateToken, requireVendor, categoryController.createCategory);
router.put('/categories/:id', authenticateToken, requireVendor, categoryController.updateCategory);
router.delete('/categories/:id', authenticateToken, requireVendor, categoryController.deleteCategory);

module.exports = router; 