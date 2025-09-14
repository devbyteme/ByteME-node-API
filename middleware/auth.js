const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Admin = require('../models/Admin');
const { isBlacklisted } = require('./tokenBlacklist');

// Middleware to authenticate JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }

    // Verify token first to get user type
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('🔐 Auth Middleware: Token decoded:', { userId: decoded.id || decoded.userId, userType: decoded.userType });
    
    // Set userType from token
    req.userType = decoded.userType;
    
    // Check if token is blacklisted for this specific user type
    if (isBlacklisted(token, decoded.userType)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated'
      });
    }
    
    // Find user based on userType in token
    let user = null;
    const userId = decoded.id || decoded.userId; // Support both id and userId fields
    
    if (decoded.userType === 'vendor') {
      user = await Vendor.findById(userId);
      if (!user) {
        return res.status(403).json({
          success: false,
          message: 'Invalid token - vendor not found'
        });
      }
    } else if (decoded.userType === 'customer' || decoded.userType === 'user') {
      user = await User.findById(userId);
      if (!user) {
        return res.status(403).json({
          success: false,
          message: 'Invalid token - user not found'
        });
      }
    } else if (decoded.userType === 'admin') {
      user = await Admin.findById(userId);
      if (!user) {
        return res.status(403).json({
          success: false,
          message: 'Invalid token - admin not found'
        });
      }
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Admin account is deactivated'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Invalid token - unknown user type'
      });
    }
    
    req.user = user;
    console.log('🔐 Auth Middleware: User authenticated:', { userType: req.userType, userId: user._id });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({
        success: false,
        message: 'Invalid token'
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

// Middleware to check if user is a vendor
const requireVendor = (req, res, next) => {
  if (req.userType !== 'vendor') {
    return res.status(403).json({
      success: false,
      message: 'Vendor access required'
    });
  }
  next();
};

// Middleware to check if user is a regular user
const requireUser = (req, res, next) => {
  if (req.userType !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'User access required'
    });
  }
  next();
};

// Middleware to check if user is authenticated (either user or vendor)
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};

// Middleware to check if user is an admin
const requireAdmin = (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Combined middleware for admin authentication
const adminOnly = [requireAuth, requireAdmin];

// Optional authentication - doesn't fail if no token, but adds user info if present
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const userId = decoded.id || decoded.userId;
      console.log('🔐 Optional Auth: Token decoded:', { userId, userType: decoded.userType });
      
      // Set userType from token
      req.userType = decoded.userType;
      
      // Check if token is blacklisted for this specific user type
      if (isBlacklisted(token, decoded.userType)) {
        console.log('🔐 Optional Auth: Token is blacklisted for userType:', decoded.userType);
        return next(); // Continue without user info
      }
      
      // Find user based on userType in token
      let user = null;
      if (decoded.userType === 'vendor') {
        user = await Vendor.findById(userId);
      } else if (decoded.userType === 'customer' || decoded.userType === 'user') {
        user = await User.findById(userId);
      } else if (decoded.userType === 'admin') {
        user = await Admin.findById(userId);
      }
      
      if (user) {
        req.user = user;
        console.log('🔐 Optional Auth: User authenticated:', { userType: req.userType, userId: user._id });
      }
    }
    
    next();
  } catch (error) {
    // If token is invalid, just continue without user info
    console.log('🔐 Optional Auth: Token verification failed, continuing without auth');
    next();
  }
};

module.exports = {
  authenticateToken,
  requireVendor,
  requireUser,
  requireAuth,
  requireAdmin,
  adminOnly,
  optionalAuth,
  protect: authenticateToken // Alias for consistency
}; 