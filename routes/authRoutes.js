const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { passport } = require('../config/passport');
const { forgotPasswordLimiter, resetPasswordLimiter } = require('../middleware/rateLimit');
const {
  registerVendor,
  loginVendor,
  googleCallback,
  customerGoogleCallback,
  adminGoogleCallback,
  getProfile,
  updateProfile,
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
} = require('../controllers/authController');

// ==================== VENDOR AUTHENTICATION ====================
router.post('/vendor/register', registerVendor);
router.post('/vendor/login', loginVendor);

// ==================== PASSWORD RESET ====================
// Vendor password reset
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', resetPasswordLimiter, resetPassword);

// Customer password reset
router.post('/customer/forgot-password', forgotPasswordLimiter, customerForgotPassword);
router.post('/customer/reset-password', resetPasswordLimiter, customerResetPassword);

// Admin password reset
router.post('/admin/forgot-password', forgotPasswordLimiter, adminForgotPassword);
router.post('/admin/reset-password', resetPasswordLimiter, adminResetPassword);

// ==================== USER AUTHENTICATION ====================
router.post('/user/register', registerUser);
router.post('/user/login', loginUser);

// ==================== GOOGLE OAUTH ====================
// Vendor Google OAuth (DON'T TOUCH - Working perfectly)
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false }), googleCallback);

// Customer Google OAuth (Completely separate implementation)
router.get('/google/customer', passport.authenticate('google-customer', { 
  scope: ['profile', 'email'],
  state: true,
  passReqToCallback: true
}));
router.get('/google/customer/callback', passport.authenticate('google-customer', { session: false }), customerGoogleCallback);

// Admin Google OAuth
router.get('/google/admin', passport.authenticate('google-admin', { scope: ['profile', 'email'] }));
router.get('/google/admin/callback', passport.authenticate('google-admin', { session: false }), adminGoogleCallback);

// ==================== PROTECTED ROUTES ====================
router.get('/me', authenticateToken, getProfile);
router.put('/me', authenticateToken, updateProfile);
router.put('/change-password', authenticateToken, changePassword);
router.post('/logout', authenticateToken, logout);
router.post('/refresh', authenticateToken, refreshToken);

module.exports = router; 