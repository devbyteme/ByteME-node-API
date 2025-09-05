const express = require('express');
const router = express.Router();
const {
  getAllVendors,
  getVendorById,
  updateVendor,
  deleteVendor
} = require('../controllers/vendorController');

// Vendor management routes (authentication handled separately)
router.get('/', getAllVendors);
router.get('/:id', getVendorById);
router.put('/:id', updateVendor);
router.delete('/:id', deleteVendor);

module.exports = router; 