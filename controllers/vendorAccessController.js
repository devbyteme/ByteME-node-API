const VendorAccess = require('../models/VendorAccess');
const Vendor = require('../models/Vendor');
const { sendEmail } = require('../services/emailService');

// @desc    Grant access to a user for vendor management
// @route   POST /api/vendor-access/grant
// @access  Private (Vendor only)
const crypto = require('crypto');

const grantAccess = async (req, res) => {
  try {
    const { userEmail, userName, expiresAt, notes } = req.body;
    const vendorId = req.user._id;

    // Check if vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check if access already exists
    const existingAccess = await VendorAccess.findOne({
      vendorId,
      userEmail: userEmail.toLowerCase()
    });

    if (existingAccess) {
      return res.status(400).json({
        success: false,
        message: 'Access already granted to this user'
      });
    }

    // Create registration access token
    const accessToken = crypto.randomBytes(24).toString('hex');

    // Create new access record
    const vendorAccess = new VendorAccess({
      vendorId,
      grantedBy: vendorId,
      userEmail: userEmail.toLowerCase(),
      userName,
      accessType: 'admin_access',
      accessToken,
      expiresAt,
      notes
    });

    await vendorAccess.save();

    // Send invitation email
    try {
      const adminPortalUrl = process.env.ADMIN_FRONTEND_URL || 'http://localhost:3002';
      const registrationLink = `${adminPortalUrl}/multi-vendor-admin-register?token=${accessToken}&email=${encodeURIComponent(userEmail)}`;

      const transporter = require('nodemailer').createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You've been granted admin access</h2>
          <p>Hello${userName ? ` ${userName}` : ''},</p>
          <p>${vendor.name} has granted you admin access to their restaurant on ByteMe.</p>
          <p>Please click the button below to set up your Multi‑Vendor Admin account:</p>
          <p style="text-align: center; margin: 24px 0;">
            <a href="${registrationLink}" style="background:#f97316;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Set up your account</a>
          </p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color:#555;">${registrationLink}</p>
          <p style="color:#888; font-size: 12px;">This link may expire${expiresAt ? ` on ${new Date(expiresAt).toLocaleString()}` : ''}.</p>
        </div>`;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || 'ByteMe <noreply@byteme.com>',
        to: userEmail,
        subject: 'ByteMe – You have been granted Multi‑Vendor Admin access',
        html
      });
    } catch (e) {
      console.warn('Failed to send vendor access invite email:', e.message);
    }
    try {
      await sendEmail({
        to: userEmail,
        subject: `Access Granted - ${vendor.name} Management Portal`,
        template: 'vendor-access-granted',
        data: {
          vendorName: vendor.name,
          userName: userName || userEmail,
          accessType: vendorAccess.accessType,
          expiresAt: vendorAccess.expiresAt,
          notes: vendorAccess.notes
        }
      });
    } catch (emailError) {
      console.error('Error sending access email:', emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Access granted successfully',
      data: vendorAccess.getAccessSummary()
    });

  } catch (error) {
    console.error('Error granting access:', error);
    
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

// @desc    Get all access grants for a vendor
// @route   GET /api/vendor-access/vendor/:vendorId
// @access  Private (Vendor only)
const getVendorAccessList = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const requestingVendorId = req.user._id;

    // Check if requesting vendor owns this vendor or has access
    if (vendorId !== requestingVendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const accessList = await VendorAccess.find({ vendorId })
      .populate('vendorId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: accessList.map(access => access.getAccessSummary())
    });

  } catch (error) {
    console.error('Error fetching vendor access list:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Get all vendors a user has access to
// @route   GET /api/vendor-access/user/:userEmail
// @access  Private
const getUserVendorAccess = async (req, res) => {
  try {
    const { userEmail } = req.params;

    const accessList = await VendorAccess.find({
      userEmail: userEmail.toLowerCase(),
      status: 'active'
    })
    .populate('vendorId', 'name email location cuisine description')
    .sort({ lastAccessedAt: -1, createdAt: -1 });

    // Filter out expired access
    const activeAccess = accessList.filter(access => access.isActive());

    res.status(200).json({
      success: true,
      data: activeAccess.map(access => ({
        id: access._id,
        vendor: access.vendorId,
        accessType: access.accessType,
        grantedAt: access.acceptedAt || access.invitedAt,
        lastAccessedAt: access.lastAccessedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching user vendor access:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Update access permissions
// @route   PUT /api/vendor-access/:accessId
// @access  Private (Vendor only)
const updateAccess = async (req, res) => {
  try {
    const { accessId } = req.params;
    const { status, notes } = req.body;
    const vendorId = req.user._id;

    const access = await VendorAccess.findById(accessId);
    if (!access) {
      return res.status(404).json({
        success: false,
        message: 'Access record not found'
      });
    }

    // Check if vendor owns this access
    if (access.vendorId.toString() !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update fields
    if (status) access.status = status;
    if (notes !== undefined) access.notes = notes;

    await access.save();

    res.status(200).json({
      success: true,
      message: 'Access updated successfully',
      data: access.getAccessSummary()
    });

  } catch (error) {
    console.error('Error updating access:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Revoke access
// @route   DELETE /api/vendor-access/:accessId
// @access  Private (Vendor only)
const revokeAccess = async (req, res) => {
  try {
    const { accessId } = req.params;
    const vendorId = req.user._id;

    const access = await VendorAccess.findById(accessId);
    if (!access) {
      return res.status(404).json({
        success: false,
        message: 'Access record not found'
      });
    }

    // Check if vendor owns this access
    if (access.vendorId.toString() !== vendorId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Soft delete - set status to revoked
    access.status = 'revoked';
    await access.save();

    res.status(200).json({
      success: true,
      message: 'Access revoked successfully'
    });

  } catch (error) {
    console.error('Error revoking access:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// @desc    Verify vendor access token
// @route   GET /api/vendor-access/verify/:accessToken
// @access  Public
const verifyVendorAccess = async (req, res) => {
  try {
    const { accessToken } = req.params;

    // Find vendor access by token
    const vendorAccess = await VendorAccess.findOne({ 
      accessToken,
      status: 'pending'
    }).populate('vendorId');

    if (!vendorAccess) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired access token'
      });
    }

    // Check if access token has expired
    if (vendorAccess.expiresAt && vendorAccess.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Access token has expired'
      });
    }

    res.json({
      success: true,
      data: {
        accessId: vendorAccess._id,
        userEmail: vendorAccess.userEmail,
        userName: vendorAccess.userName,
        vendorId: vendorAccess.vendorId._id,
        vendorName: vendorAccess.vendorId.name,
        accessType: vendorAccess.accessType,
        grantedAt: vendorAccess.grantedAt,
        expiresAt: vendorAccess.expiresAt
      }
    });

  } catch (error) {
    console.error('Error verifying vendor access:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Accept access invitation
// @route   POST /api/vendor-access/:accessId/accept
// @access  Private
const acceptAccess = async (req, res) => {
  try {
    const { accessId } = req.params;
    const { userEmail } = req.body;

    const access = await VendorAccess.findById(accessId);
    if (!access) {
      return res.status(404).json({
        success: false,
        message: 'Access invitation not found'
      });
    }

    // Check if email matches
    if (access.userEmail.toLowerCase() !== userEmail.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: 'Email does not match invitation'
      });
    }

    // Update access status
    access.status = 'active';
    access.acceptedAt = new Date();
    access.lastAccessedAt = new Date();
    await access.save();

    res.status(200).json({
      success: true,
      message: 'Access accepted successfully',
      data: access.getAccessSummary()
    });

  } catch (error) {
    console.error('Error accepting access:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

module.exports = {
  grantAccess,
  getVendorAccessList,
  getUserVendorAccess,
  updateAccess,
  revokeAccess,
  acceptAccess,
  verifyVendorAccess
};
