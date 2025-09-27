const express = require('express');
const router = express.Router();
const {
  grantAccess,
  getVendorAccessList,
  getUserVendorAccess,
  updateAccess,
  revokeAccess,
  acceptAccess,
  verifyVendorAccess
} = require('../controllers/vendorAccessController');
const { authenticateToken, requireVendor } = require('../middleware/auth');

// Grant access to a user (Vendor only)
router.post('/grant', authenticateToken, requireVendor, grantAccess);

// Get all access grants for a vendor (Vendor only)
router.get('/vendor/:vendorId', authenticateToken, requireVendor, getVendorAccessList);

// Get all vendors a user has access to
router.get('/user/:userEmail', authenticateToken, getUserVendorAccess);

// Update access permissions (Vendor only)
router.put('/:accessId', authenticateToken, requireVendor, updateAccess);

// Revoke access (Vendor only)
router.delete('/:accessId', authenticateToken, requireVendor, revokeAccess);

// Accept access invitation
router.post('/:accessId/accept', authenticateToken, acceptAccess);

// Verify access token (public)
router.get('/verify/:accessToken', verifyVendorAccess);

module.exports = router;
