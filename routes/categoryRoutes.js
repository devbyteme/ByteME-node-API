const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { authenticateToken, requireVendor } = require('../middleware/auth');
const Category = require('../models/Category');

// Public route for getting categories by vendor ID (no authentication required)
// This must be defined BEFORE the authentication middleware
router.get('/public/:vendorId', async (req, res) => {
  try {
    console.log('Public category route hit with vendorId:', req.params.vendorId);
    const { vendorId } = req.params;
    
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    const categories = await Category.find({ 
      vendorId, 
      isActive: true 
    })
    .sort({ sortOrder: 1, displayName: 1 })
    .select('name displayName description color icon sortOrder');

    console.log('Found categories:', categories.length);
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });

  } catch (error) {
    console.error('Error getting public categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
});

// All other routes require vendor authentication
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
