const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, requireVendor } = require('../middleware/auth');

// All routes require vendor authentication
router.use(authenticateToken, requireVendor);

// @desc    Get all categories for vendor
// @route   GET /api/menu/categories
// @access  Private (Vendor only)
router.get('/', categoryController.getCategories);

// @desc    Initialize default categories for vendor
// @route   POST /api/menu/categories/initialize
// @access  Private (Vendor only)
router.post('/initialize', categoryController.initializeDefaultCategories);

// @desc    Reorder categories
// @route   PATCH /api/menu/categories/reorder
// @access  Private (Vendor only)
router.patch('/reorder', categoryController.reorderCategories);

// @desc    Get category by ID
// @route   GET /api/menu/categories/:id
// @access  Private (Vendor only)
router.get('/:id', categoryController.getCategoryById);

// @desc    Create new category
// @route   POST /api/menu/categories
// @access  Private (Vendor only)
router.post('/', categoryController.createCategory);

// @desc    Update category
// @route   PUT /api/menu/categories/:id
// @access  Private (Vendor only)
router.put('/:id', categoryController.updateCategory);

// @desc    Delete category
// @route   DELETE /api/menu/categories/:id
// @access  Private (Vendor only)
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
