const User = require('../models/User');
const Vendor = require('../models/Vendor');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateToken, generateCustomerToken } = require('../config/passport');
const { 
  sendPasswordResetEmail, 
  sendVendorWelcomeEmail, 
  sendCustomerWelcomeEmail, 
  sendAdminWelcomeEmail 
} = require('../services/emailService');

// @desc    Register vendor
// @route   POST /api/auth/vendor/register
// @access  Public
const registerVendor = async (req, res) => {
  try {
    const { name, email, password, location, phone, cuisine, description } = req.body;

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: 'Vendor with this email already exists'
      });
    }

    // Create new vendor
    const vendor = new Vendor({
      name,
      email,
      password,
      location,
      phone,
      cuisine,
      description
    });

    await vendor.save();

    // Send welcome email
    try {
      await sendVendorWelcomeEmail(vendor.email, vendor.name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate JWT token
    const token = generateToken(vendor);

    res.status(201).json({
      success: true,
      message: 'Vendor registered successfully',
      token,
      user: vendor.getPublicProfile()
    });

  } catch (error) {
    console.error('Error registering vendor:', error);
    
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

// @desc    Login vendor
// @route   POST /api/auth/vendor/login
// @access  Public
const loginVendor = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find vendor by email
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if vendor is active
    if (!vendor.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isPasswordValid = await vendor.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(vendor);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: vendor.getPublicProfile()
    });

  } catch (error) {
    console.error('Error logging in vendor:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
const googleCallback = async (req, res) => {
  try {
    console.log('🔐 Backend: Vendor Google OAuth callback for user:', req.user.email, 'userType:', req.user.userType);
    
    // Generate JWT token for the authenticated user
    const token = generateToken(req.user);
    
    // Get user profile data
    let userProfile;
    if (req.user.userType === 'vendor') {
      userProfile = req.user.getPublicProfile();
    } else {
      userProfile = req.user.getPublicProfile();
    }
    
    // Encode user data to pass in URL (since we can't send complex objects in redirect)
    const userData = encodeURIComponent(JSON.stringify(userProfile));
    
    // Redirect to frontend with token and user data
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/vendor-login?token=${token}&googleAuth=true&userData=${userData}`);
    
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/vendor-login?error=Google authentication failed`);
  }
};

// @desc    Handle customer Google OAuth callback
// @route   GET /api/auth/google/customer/callback
// @access  Public
const customerGoogleCallback = async (req, res) => {
  try {
    console.log('🔐 Backend: Customer Google OAuth callback triggered');
    console.log('🔐 Backend: User data:', req.user?.email, 'userType:', req.user?.userType);
    console.log('🔐 Backend: Query params:', req.query);
    
    // Verify we have a valid customer user
    if (!req.user || req.user.userType !== 'customer') {
      console.error('🔐 Backend: Invalid user or userType in customer callback');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/customer-auth?error=Invalid user type for customer authentication`);
    }
    
    // Generate JWT token for the customer (using customer-specific token generation)
    const token = generateCustomerToken(req.user);
    console.log('🔐 Backend: Customer JWT token generated with userType: customer');
    
    // Get customer profile data (without sensitive info)
    const userProfile = req.user.getPublicProfile();
    console.log('🔐 Backend: Customer profile data prepared');
    
    // Encode user data to pass in URL
    const userData = encodeURIComponent(JSON.stringify(userProfile));
    
    // Get the redirect URL from state parameter
    const stateParam = req.query?.state;
    console.log('🔐 Backend: State parameter received:', stateParam);
    
    if (stateParam) {
      try {
        // Decode the state parameter to get the original redirect URL
        const decodedState = decodeURIComponent(stateParam);
        console.log('🔐 Backend: Decoded state parameter:', decodedState);
        
        // Build the final redirect URL with authentication data
        const finalRedirectUrl = `${decodedState}&token=${token}&googleAuth=true&userData=${userData}`;
        console.log('🔐 Backend: Final redirect URL:', finalRedirectUrl);
        
        // Redirect the customer to the menu page with auth data
        res.redirect(finalRedirectUrl);
        
      } catch (decodeError) {
        console.error('🔐 Backend: Error decoding state parameter:', decodeError);
        // Fallback: redirect to customer auth page
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/customer-auth?token=${token}&googleAuth=true&userData=${userData}`);
      }
    } else {
      console.log('🔐 Backend: No state parameter found, using fallback redirect');
      // Fallback: redirect to customer auth page
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/customer-auth?token=${token}&googleAuth=true&userData=${userData}`);
    }
    
  } catch (error) {
    console.error('🔐 Backend: Customer Google OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/customer-auth?error=Google authentication failed`);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getProfile = async (req, res) => {
  try {
    let user;
    
    if (req.userType === 'vendor') {
      user = await Vendor.findById(req.user._id).select('-password');
    } else {
      user = await User.findById(req.user._id).select('-password');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    let user;
    if (req.userType === 'vendor') {
      user = await Vendor.findById(req.user._id);
    } else {
      user = await User.findById(req.user._id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    const { addToBlacklist } = require('../middleware/tokenBlacklist');
    
    // Get the token from the request
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (token) {
      // Add token to blacklist with user type to invalidate it
      // This ensures customer logout doesn't affect vendor tokens and vice versa
      addToBlacklist(token, req.userType);
      console.log('🔐 User logged out, token blacklisted:', req.user._id, 'userType:', req.userType);
    }
    
    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Error during logout:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Private
const refreshToken = async (req, res) => {
  try {
    // Generate new token
    const token = generateToken(req.user);

    res.json({
      success: true,
      token
    });

  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Register user
// @route   POST /api/auth/user/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, phone, preferences } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      phone,
      preferences: preferences || {}
    });

    await user.save();

    // Send welcome email
    try {
      await sendCustomerWelcomeEmail(user.email, `${user.firstName} ${user.lastName}`);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Generate JWT token for customer
    const token = generateCustomerToken(user);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Error registering user:', error);
    
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

// @desc    Login user
// @route   POST /api/auth/user/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token for customer
    const token = generateCustomerToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Forgot password - send reset email for vendors
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find vendor by email
    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Check if vendor is active
    if (!vendor.isActive) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = vendor.generatePasswordResetToken();
    await vendor.save();

    try {
      // Send password reset email
      await sendPasswordResetEmail(vendor.email, resetToken);
      
      res.json({
        success: true,
        message: 'Password reset email sent successfully',
        data: {
          email: vendor.email,
          resetTokenExpiry: vendor.resetPasswordExpires
        }
      });
    } catch (emailError) {
      // If email fails, clear the reset token
      vendor.resetPasswordToken = undefined;
      vendor.resetPasswordExpires = undefined;
      await vendor.save();
      
      console.error('Email sending failed:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Forgot password - send reset email for customers
// @route   POST /api/auth/customer/forgot-password
// @access  Public
const customerForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find customer by email
    const customer = await User.findOne({ email });
    if (!customer) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Check if customer is active
    if (!customer.isActive) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = customer.generatePasswordResetToken();
    await customer.save();

    try {
      // Send password reset email
      await sendPasswordResetEmail(customer.email, resetToken);
      
      res.json({
        success: true,
        message: 'Password reset email sent successfully',
        data: {
          email: customer.email,
          resetTokenExpiry: customer.resetPasswordExpires
        }
      });
    } catch (emailError) {
      // If email fails, clear the reset token
      customer.resetPasswordToken = undefined;
      customer.resetPasswordExpires = undefined;
      await customer.save();
      
      console.error('Email sending failed:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Error in customer forgot password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Forgot password - send reset email for admins
// @route   POST /api/auth/admin/forgot-password
// @access  Public
const adminForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find admin by email
    const Admin = require('../models/Admin');
    const admin = await Admin.findOne({ email });
    if (!admin) {
      // Don't reveal if email exists or not for security
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent'
      });
    }

    // Generate reset token
    const resetToken = admin.generatePasswordResetToken();
    await admin.save();

    try {
      // Send password reset email
      await sendPasswordResetEmail(admin.email, resetToken);
      
      res.json({
        success: true,
        message: 'Password reset email sent successfully',
        data: {
          email: admin.email,
          resetTokenExpiry: admin.resetPasswordExpires
        }
      });
    } catch (emailError) {
      // If email fails, clear the reset token
      admin.resetPasswordToken = undefined;
      admin.resetPasswordExpires = undefined;
      await admin.save();
      
      console.error('Email sending failed:', emailError);
      res.status(500).json({
        success: false,
        message: 'Failed to send reset email. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Error in admin forgot password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Reset password with token for vendors
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Hash the token to compare with stored hash
    const crypto = require('crypto');
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find vendor with valid reset token
    const vendor = await Vendor.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    vendor.password = password; // Will be hashed by pre-save middleware
    vendor.resetPasswordToken = undefined;
    vendor.resetPasswordExpires = undefined;
    await vendor.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        email: vendor.email,
        passwordUpdatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error in reset password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Reset password with token for customers
// @route   POST /api/auth/customer/reset-password
// @access  Public
const customerResetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Hash the token to compare with stored hash
    const crypto = require('crypto');
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find customer with valid reset token
    const customer = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    customer.password = password; // Will be hashed by pre-save middleware
    customer.resetPasswordToken = undefined;
    customer.resetPasswordExpires = undefined;
    await customer.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        email: customer.email,
        passwordUpdatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error in customer reset password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
};

// @desc    Reset password with token for admins
// @route   POST /api/auth/admin/reset-password
// @access  Public
const adminResetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Validate input
    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Hash the token to compare with stored hash
    const crypto = require('crypto');
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find admin with valid reset token
    const Admin = require('../models/Admin');
    const admin = await Admin.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Update password and clear reset token
    admin.password = password; // Will be hashed by pre-save middleware
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();

    res.json({
      success: true,
      message: 'Password reset successfully',
      data: {
        email: admin.email,
        passwordUpdatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error in admin reset password:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
    }
};

module.exports = {
  registerVendor,
  loginVendor,
  googleCallback,
  customerGoogleCallback,
  getProfile,
  changePassword,
  logout,
  refreshToken,
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  customerForgotPassword,
  customerResetPassword,
  adminForgotPassword,
  adminResetPassword
};
