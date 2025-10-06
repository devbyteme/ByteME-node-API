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
router.get('/google/customer', (req, res, next) => {
  // Pass the state parameter through the session so it survives the OAuth flow
  if (req.query.state) {
    req.session.oauth_redirect_url = decodeURIComponent(req.query.state);
    console.log('🔐 OAuth Init: Storing redirect URL in session:', req.session.oauth_redirect_url);
  }
  passport.authenticate('google-customer', { 
    scope: ['profile', 'email'],
    passReqToCallback: true
  })(req, res, next);
});
router.get('/google/customer/callback', (req, res, next) => {
  passport.authenticate('google-customer', { session: false }, (err, user, info) => {
    if (err) {
      console.error('🔐 Customer Google OAuth error:', err);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/customer-auth?error=Google authentication failed: ${encodeURIComponent(err.message)}`);
    }
    if (!user) {
      console.error('🔐 Customer Google OAuth: No user returned', info);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/customer-auth?error=Authentication failed - no user`);
    }
    req.user = user;
    next();
  })(req, res, next);
}, customerGoogleCallback);

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