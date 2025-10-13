const Vendor = require('../models/Vendor');
const { deleteUploadedFile } = require('../middleware/uploadVendorLogo');

// @desc    Get all vendors
// @route   GET /api/vendors
// @access  Public
const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find({ isActive: true })
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: vendors.length,
      data: vendors
    });

  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get vendor by ID
// @route   GET /api/vendors/:id
// @access  Public
const getVendorById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).select('-password');
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    res.status(200).json({
      success: true,
      data: vendor
    });

  } catch (error) {
    console.error('Error fetching vendor:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid vendor ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Update vendor
// @route   PUT /api/vendors/:id
// @access  Private
const updateVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Update fields
    const updateFields = ['name', 'location', 'phone', 'cuisine', 'description', 'openingHours'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        vendor[field] = req.body[field];
      }
    });

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully',
      data: vendor.getPublicProfile()
    });

  } catch (error) {
    console.error('Error updating vendor:', error);
    
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
      message: 'Internal server error'
    });
  }
};

// @desc    Delete vendor
// @route   DELETE /api/vendors/:id
// @access  Private
const deleteVendor = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Soft delete - set isActive to false
    vendor.isActive = false;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Update vendor profile (for authenticated vendor)
// @route   PUT /api/vendors/profile
// @access  Private (Vendor only)
const updateVendorProfile = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user._id);
    
    if (!vendor) {
      // If there was a file uploaded but vendor not found, delete it from S3
      if (req.file) {
        await deleteUploadedFile(req.file.key);
      }
      
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Handle logo upload
    if (req.file) {
      console.log('Logo file uploaded:', req.file.location);
      
      // If there was an existing logo, delete it from S3
      if (vendor.logo) {
        try {
          const oldLogoKey = vendor.logo.split('/').pop();
          await deleteUploadedFile(`vendor-logos/${oldLogoKey}`);
        } catch (s3Error) {
          console.error('Error deleting old logo from S3:', s3Error);
          // Continue with update even if old logo deletion fails
        }
      }
      
      vendor.logo = req.file.location;
    } else if (req.body.logo !== undefined) {
      // Handle direct logo URL or setting logo to null
      vendor.logo = req.body.logo;
      console.log('Logo updated via URL:', req.body.logo);
    }

    // Update other fields
    const updateFields = ['name', 'description', 'cuisine', 'phone', 'location', 'billingSettings'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        vendor[field] = req.body[field];
      }
    });

    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Vendor profile updated successfully',
      data: vendor.getPublicProfile()
    });

  } catch (error) {
    console.error('Error updating vendor profile:', error);
    
    // If there was a file uploaded but update failed, delete it from S3
    if (req.file) {
      await deleteUploadedFile(req.file.key);
    }

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
      message: 'Internal server error'
    });
  }
};

// @desc    Delete vendor logo
// @route   DELETE /api/vendors/profile/logo
// @access  Private (Vendor only)
const deleteVendorLogo = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.user._id);
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    if (!vendor.logo) {
      return res.status(400).json({
        success: false,
        message: 'No logo to delete'
      });
    }

    // Delete logo from S3
    try {
      const logoKey = vendor.logo.split('/').pop();
      await deleteUploadedFile(`vendor-logos/${logoKey}`);
    } catch (s3Error) {
      console.error('Error deleting logo from S3:', s3Error);
      // Continue with logo deletion from database even if S3 deletion fails
    }

    // Remove logo from vendor document
    vendor.logo = null;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: 'Logo deleted successfully',
      data: vendor.getPublicProfile()
    });

  } catch (error) {
    console.error('Error deleting vendor logo:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  getAllVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  updateVendorProfile,
  deleteVendorLogo
};