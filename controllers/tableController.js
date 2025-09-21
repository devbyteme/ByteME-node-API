const Table = require('../models/Table');

// @desc    Get all tables for a vendor
// @route   GET /api/tables
// @access  Private (Vendor only)
const getAllTables = async (req, res) => {
  try {
    const { vendorId } = req.query;
    
    let query = {};
    
    // Filter by vendor if specified
    if (vendorId) {
      query.vendorId = vendorId;
    }
    
    const tables = await Table.find(query)
      .populate('vendorId', 'name restaurantName')
      .sort({ number: 1 });

    res.json({
      success: true,
      count: tables.length,
      data: tables
    });

  } catch (error) {
    console.error('Error getting tables:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get table by ID
// @route   GET /api/tables/:id
// @access  Public
const getTableById = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id)
      .populate('vendorId', 'name restaurantName');

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    res.json({
      success: true,
      data: table
    });

  } catch (error) {
    console.error('Error getting table:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid table ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Create new table
// @route   POST /api/tables
// @access  Private (Vendor only)
const createTable = async (req, res) => {
  try {
    const {
      number,
      location,
      capacity,
      vendorId
    } = req.body;

    // Validate required fields
    if (!number || !number.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Table number is required'
      });
    }

    if (!capacity || capacity < 1 || capacity > 20) {
      return res.status(400).json({
        success: false,
        message: 'Table capacity is required and must be between 1 and 20'
      });
    }

    const actualVendorId = vendorId || req.user._id;
    if (!actualVendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }

    // Check if table number already exists for this vendor
    const existingTable = await Table.findOne({
      number: number.trim(),
      vendorId: actualVendorId
    });

    if (existingTable) {
      return res.status(400).json({
        success: false,
        message: 'Table number already exists for this vendor'
      });
    }

    // Create new table
    const table = new Table({
      number: number.trim(),
      location: location ? location.trim() : 'indoor',
      capacity: parseInt(capacity),
      vendorId: actualVendorId
    });

    await table.save();

    // Populate the vendor information before sending response
    const populatedTable = await Table.findById(table._id)
      .populate('vendorId', 'name restaurantName');

    res.status(201).json({
      success: true,
      message: 'Table created successfully',
      data: populatedTable
    });

  } catch (error) {
    console.error('Error creating table:', error);
    
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

// @desc    Update table
// @route   PUT /api/tables/:id
// @access  Private (Vendor only)
const updateTable = async (req, res) => {
  try {
    const {
      number,
      location,
      capacity,
      status
    } = req.body;

    // Find table and ensure it belongs to the authenticated vendor
    const table = await Table.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found or access denied'
      });
    }

    // Check if new table number conflicts with existing table
    if (number && number.trim() !== table.number) {
      const existingTable = await Table.findOne({
        number: number.trim(),
        vendorId: req.user._id,
        _id: { $ne: req.params.id }
      });

      if (existingTable) {
        return res.status(400).json({
          success: false,
          message: 'Table number already exists for this vendor'
        });
      }
    }

    // Update fields
    if (number !== undefined) table.number = number.trim();
    if (location !== undefined) table.location = location ? location.trim() : 'indoor';
    if (capacity !== undefined) {
      if (capacity < 1 || capacity > 20) {
        return res.status(400).json({
          success: false,
          message: 'Table capacity must be between 1 and 20'
        });
      }
      table.capacity = parseInt(capacity);
    }
    if (status !== undefined) table.status = status;

    await table.save();

    // Populate the vendor information before sending response
    const populatedTable = await Table.findById(table._id)
      .populate('vendorId', 'name restaurantName');

    res.json({
      success: true,
      message: 'Table updated successfully',
      data: populatedTable
    });

  } catch (error) {
    console.error('Error updating table:', error);
    
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
        message: 'Invalid table ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Delete table
// @route   DELETE /api/tables/:id
// @access  Private (Vendor only)
const deleteTable = async (req, res) => {
  try {
    // Find table and ensure it belongs to the authenticated vendor
    const table = await Table.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found or access denied'
      });
    }

    // Check if table has active orders
    if (table.currentOrder) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete table with active orders'
      });
    }

    await table.deleteOne();

    res.json({
      success: true,
      message: 'Table deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting table:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid table ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Update table status
// @route   PATCH /api/tables/:id/status
// @access  Private (Vendor only)
const updateTableStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!['available', 'occupied', 'reserved', 'maintenance'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }

    // Find table and ensure it belongs to the authenticated vendor
    const table = await Table.findOne({
      _id: req.params.id,
      vendorId: req.user._id
    });

    if (!table) {
      return res.status(404).json({
        success: false,
        message: 'Table not found or access denied'
      });
    }

    table.status = status;
    await table.save();

    // Populate the vendor information before sending response
    const populatedTable = await Table.findById(table._id)
      .populate('vendorId', 'name restaurantName');

    res.json({
      success: true,
      message: `Table status updated to ${status}`,
      data: populatedTable
    });

  } catch (error) {
    console.error('Error updating table status:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid table ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Get table availability
// @route   GET /api/tables/availability
// @access  Public
const getTableAvailability = async (req, res) => {
  try {
    const { vendorId, date, time } = req.query;
    
    if (!vendorId) {
      return res.status(400).json({
        success: false,
        message: 'Vendor ID is required'
      });
    }
    
    let query = { vendorId };
    
    if (date && time) {
      // This is a placeholder for more complex availability logic
      // In a real implementation, you'd check against reservations and orders
      query.status = { $in: ['available', 'reserved'] };
    }

    const tables = await Table.find(query)
      .populate('vendorId', 'name restaurantName')
      .sort({ number: 1 });

    res.json({
      success: true,
      count: tables.length,
      data: tables
    });

  } catch (error) {
    console.error('Error getting table availability:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

module.exports = {
  getAllTables,
  getTableById,
  createTable,
  updateTable,
  deleteTable,
  updateTableStatus,
  getTableAvailability
};
