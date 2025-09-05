const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');

// @desc    Get all categories for a vendor
// @route   GET /api/menu/categories
// @access  Private (Vendor only)
const getCategories = async (req, res) => {
  try {
    const vendorId = req.user._id;
    
    const categories = await Category.find({ vendorId, isActive: true })
      .sort({ sortOrder: 1, displayName: 1 });

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });

  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get category by ID
// @route   GET /api/menu/categories/:id
// @access  Private (Vendor only)
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });

  } catch (error) {
    console.error('Error getting category:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Create new category
// @route   POST /api/menu/categories
// @access  Private (Vendor only)
const createCategory = async (req, res) => {
  try {
    const { name, displayName, description, icon, color, sortOrder } = req.body;

    // Check if category name already exists for this vendor
    const existingCategory = await Category.findOne({
      vendorId: req.user._id,
      name: name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_')
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }

    const category = new Category({
      name,
      displayName,
      description,
      icon,
      color,
      sortOrder,
      vendorId: req.user._id
    });

    await category.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });

  } catch (error) {
    console.error('Error creating category:', error);
    
    // Handle validation errors
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

// @desc    Update category
// @route   PUT /api/menu/categories/:id
// @access  Private (Vendor only)
const updateCategory = async (req, res) => {
  try {
    const { name, displayName, description, icon, color, sortOrder, isActive } = req.body;

    // Find category and ensure it belongs to the authenticated vendor
    const category = await Category.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or access denied'
      });
    }

    // Check if new name conflicts with existing category (excluding current one)
    if (name && name !== category.name) {
      const conflictingCategory = await Category.findOne({
        vendorId: req.user._id,
        name: name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_'),
        _id: { $ne: category._id }
      });

      if (conflictingCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }

    // Update fields
    if (name !== undefined) category.name = name;
    if (displayName !== undefined) category.displayName = displayName;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });

  } catch (error) {
    console.error('Error updating category:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/menu/categories/:id
// @access  Private (Vendor only)
const deleteCategory = async (req, res) => {
  try {
    // Find category and ensure it belongs to the authenticated vendor
    const category = await Category.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found or access denied'
      });
    }

    // Check if there are menu items using this category
    const menuItemsCount = await MenuItem.countDocuments({
      vendorId: req.user._id,
      category: category.name
    });

    if (menuItemsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${menuItemsCount} menu items are still using this category. Please reassign them first.`
      });
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Reorder categories
// @route   PATCH /api/menu/categories/reorder
// @access  Private (Vendor only)
const reorderCategories = async (req, res) => {
  try {
    const { categoryOrders } = req.body; // Array of { id, sortOrder }

    if (!Array.isArray(categoryOrders)) {
      return res.status(400).json({
        success: false,
        message: 'categoryOrders must be an array'
      });
    }

    // Update all categories in a single operation
    const bulkOps = categoryOrders.map(({ id, sortOrder }) => ({
      updateOne: {
        filter: { _id: id, vendorId: req.user._id },
        update: { sortOrder }
      }
    }));

    const result = await Category.bulkWrite(bulkOps);

    res.json({
      success: true,
      message: 'Categories reordered successfully',
      data: {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('Error reordering categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Initialize default categories for a vendor
// @route   POST /api/menu/categories/initialize
// @access  Private (Vendor only)
const initializeDefaultCategories = async (req, res) => {
  try {
    const vendorId = req.user._id;

    // Check if vendor already has categories
    const existingCategories = await Category.countDocuments({ vendorId });
    
    if (existingCategories > 0) {
      return res.status(400).json({
        success: false,
        message: 'Vendor already has categories. Use the regular create endpoint to add more.'
      });
    }

    // Create default categories
    const categories = await Category.createDefaultCategories(vendorId);

    res.status(201).json({
      success: true,
      message: 'Default categories initialized successfully',
      count: categories.length,
      data: categories
    });

  } catch (error) {
    console.error('Error initializing default categories:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  initializeDefaultCategories
};
