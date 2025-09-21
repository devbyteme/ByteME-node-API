const express = require('express');
const router = express.Router();
const {
  getAllVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
  updateVendorProfile
} = require('../controllers/vendorController');
const { authenticateToken, requireVendor } = require('../middleware/auth');

// Vendor management routes (authentication handled separately)
router.get('/', getAllVendors);

// Profile update route for authenticated vendors (must come before /:id routes)
router.put('/profile', authenticateToken, requireVendor, updateVendorProfile);

// Generic vendor routes (must come after specific routes)
router.get('/:id', getVendorById);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

module.exports = router; 