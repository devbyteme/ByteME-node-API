const MenuItem = require('../models/MenuItem');

// @desc    Get all menu items
// @route   GET /api/menu-items
// @access  Public
const getAllMenuItems = async (req, res) => {
  try {
    const { vendorId, category, available } = req.query;
    
    console.log('getAllMenuItems called with query params:', { vendorId, category, available });
    
    let query = {};
    
    // Filter by vendor if specified
    if (vendorId) {
      query.vendorId = vendorId;
      console.log('Added vendorId filter:', vendorId);
    }
    
    // Filter by category if specified
    if (category) {
      query.category = category;
      console.log('Added category filter:', category);
    }
    
    // Filter by availability if specified
    if (available !== undefined) {
      query.available = available === 'true';
      console.log('Added available filter:', query.available);
    }
    
    console.log('Final MongoDB query:', JSON.stringify(query));
    
    const menuItems = await MenuItem.find(query)
      .populate('vendorId', 'name cuisine')
      .sort({ createdAt: -1 });

    console.log(`Found ${menuItems.length} menu items`);
    console.log('Menu items vendor IDs:', menuItems.map(item => item.vendorId));

    res.json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });

  } catch (error) {
    console.error('Error getting menu items:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get menu item by ID
// @route   GET /api/menu-items/:id
// @access  Public
const getMenuItemById = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id)
      .populate('vendorId', 'name cuisine');

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: menuItem
    });

  } catch (error) {
    console.error('Error getting menu item:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get menu items by category
// @route   GET /api/menu-items/category/:category
// @access  Public
const getMenuItemsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { vendorId, available } = req.query;
    
    let query = { category };
    
    // Filter by vendor if specified
    if (vendorId) {
      query.vendorId = vendorId;
    }
    
    // Filter by availability if specified
    if (available !== undefined) {
      query.available = available === 'true';
    }
    
    const menuItems = await MenuItem.find(query)
      .populate('vendorId', 'name cuisine')
      .sort({ name: 1 });

    res.json({
      success: true,
      count: menuItems.length,
      data: menuItems
    });

  } catch (error) {
    console.error('Error getting menu items by category:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Create new menu item
// @route   POST /api/menu-items
// @access  Private (Vendor only)
const createMenuItem = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      available,
      ingredients,
      allergens,
      nutritionalInfo,
      preparationTime,
      dietary_info
    } = req.body;

     // Get image URL from uploaded file
    const image = req.file ? req.file.location : null;

    // Parse JSON fields if they come as strings
    const parsedIngredients = ingredients ? JSON.parse(ingredients) : [];
    const parsedAllergens = allergens ? JSON.parse(allergens) : [];
    const parsedNutritionalInfo = nutritionalInfo ? JSON.parse(nutritionalInfo) : {};
    const parsedDietaryInfo = dietary_info ? JSON.parse(dietary_info) : [];
    
    const menuItem = new MenuItem({
      name,
      description,
      price,
      category,
      available,
      image,
      ingredients: parsedIngredients,
      allergens: parsedAllergens,
      nutritionalInfo: parsedNutritionalInfo,
      preparationTime,
      dietary_info: parsedDietaryInfo,
      vendorId: req.user._id
    });

    await menuItem.save();

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: menuItem
    });

  } catch (error) {
    console.error('Error creating menu item:', error);
    
    // If there was a file uploaded but validation failed, delete it from S3
    if (req.file) {
      try {
        const deleteParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: req.file.key
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
      } catch (s3Error) {
        console.error('Error deleting uploaded file from S3:', s3Error);
      }
    }

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

// @desc    Update menu item
// @route   PUT /api/menu-items/:id
// @access  Private (Vendor only)
const updateMenuItem = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      available,
      ingredients,
      allergens,
      nutritionalInfo,
      preparationTime,
      dietary_info
    } = req.body;

    // Find menu item and ensure it belongs to the authenticated vendor
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!menuItem) {
      // If there was a file uploaded but menu item not found, delete it from S3
      if (req.file) {
        try {
          const deleteParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: req.file.key
          };
          await s3Client.send(new DeleteObjectCommand(deleteParams));
        } catch (s3Error) {
          console.error('Error deleting uploaded file from S3:', s3Error);
        }
      }
      
      return res.status(404).json({
        success: false,
        message: 'Menu item not found or access denied'
      });
    }

    // If a new image is uploaded, delete the old one from S3
    if (req.file && menuItem.image) {
      try {
        const oldImageKey = menuItem.image.split('/').pop();
        const deleteParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: `menu-items/${oldImageKey}`
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
      } catch (s3Error) {
        console.error('Error deleting old image from S3:', s3Error);
      }
    }

    // Update fields
    if (name !== undefined) menuItem.name = name;
    if (description !== undefined) menuItem.description = description;
    if (price !== undefined) menuItem.price = price;
    if (category !== undefined) menuItem.category = category;
    if (available !== undefined) menuItem.available = available;
    if (req.file) menuItem.image = req.file.location; // Update image if new file uploaded
    
    // Parse and update other fields
    if (ingredients !== undefined) menuItem.ingredients = JSON.parse(ingredients);
    if (allergens !== undefined) menuItem.allergens = JSON.parse(allergens);
    if (nutritionalInfo !== undefined) menuItem.nutritionalInfo = JSON.parse(nutritionalInfo);
    if (preparationTime !== undefined) menuItem.preparationTime = preparationTime;
    if (dietary_info !== undefined) menuItem.dietary_info = JSON.parse(dietary_info);

    await menuItem.save();

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItem
    });

  } catch (error) {
    console.error('Error updating menu item:', error);
    
    // If there was a file uploaded but update failed, delete it from S3
    if (req.file) {
      try {
        const deleteParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: req.file.key
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
      } catch (s3Error) {
        console.error('Error deleting uploaded file from S3:', s3Error);
      }
    }

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
        message: 'Invalid menu item ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Delete menu item
// @route   DELETE /api/menu-items/:id
// @access  Private (Vendor only)
const deleteMenuItem = async (req, res) => {
  try {
    // Find menu item and ensure it belongs to the authenticated vendor
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found or access denied'
      });
    }

    // Delete image from S3 if it exists
    if (menuItem.image) {
      try {
        const imageKey = menuItem.image.split('/').pop();
        const deleteParams = {
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: `menu-items/${imageKey}`
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
      } catch (s3Error) {
        console.error('Error deleting image from S3:', s3Error);
        // Continue with menu item deletion even if image deletion fails
      }
    }

    await menuItem.deleteOne();

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting menu item:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Update menu item availability
// @route   PATCH /api/menu-items/:id/availability
// @access  Private (Vendor only)
const updateMenuItemAvailability = async (req, res) => {
  try {
    const { available } = req.body;

    if (typeof available !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Available field must be a boolean'
      });
    }

    // Find menu item and ensure it belongs to the authenticated vendor
    const menuItem = await MenuItem.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found or access denied'
      });
    }

    menuItem.available = available;
    await menuItem.save();

    res.json({
      success: true,
      message: `Menu item ${available ? 'made available' : 'made unavailable'} successfully`,
      data: menuItem
    });

  } catch (error) {
    console.error('Error updating menu item availability:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid menu item ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

module.exports = {
  getAllMenuItems,
  getMenuItemById,
  getMenuItemsByCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateMenuItemAvailability
}; 