const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const GeneralAdmin = require('../models/GeneralAdmin');
const MultiVendorAdmin = require('../models/MultiVendorAdmin');
const jwt = require('jsonwebtoken');

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await Vendor.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Vendor Google OAuth Strategy
passport.use('google', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if vendor already exists
    let vendor = await Vendor.findOne({ email: profile.emails[0].value });
    
    if (!vendor) {
      // Create new vendor account
      vendor = new Vendor({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
        // Set default values for required fields
        location: {
          address: 'Address not provided',
          city: 'City not provided',
          state: 'State not provided',
          zipCode: 'ZIP not provided'
        },
        phone: 'Phone not provided',
        cuisine: 'Cuisine not specified',
        // Generate a random password for Google users
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
      });
      
      await vendor.save();
    } else if (!vendor.googleId) {
      // Link existing vendor account with Google
      vendor.googleId = profile.id;
      await vendor.save();
    }
    
    // Set userType for vendor
    vendor.userType = 'vendor';
    
    return done(null, vendor);
  } catch (error) {
    return done(error, null);
  }
}));

// Customer Google OAuth Strategy (Completely separate from vendor)
passport.use('google-customer', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CUSTOMER_CALLBACK_URL || "http://localhost:3000/api/auth/google/customer/callback",
  scope: ['profile', 'email'],
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔐 Passport: Customer Google OAuth strategy called for:', profile.emails[0].value);
    
    // Check if customer already exists
    let customer = await User.findOne({ email: profile.emails[0].value });
    
    if (!customer) {
      // Create new customer account
      customer = new User({
        firstName: profile.name?.givenName || profile.displayName.split(' ')[0] || 'Customer',
        lastName: profile.name?.familyName || profile.displayName.split(' ').slice(1).join(' ') || 'User',
        email: profile.emails[0].value,
        googleId: profile.id,
        // Generate a random password for Google users
        password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
      });
      
      await customer.save();
      console.log('🔐 Passport: New customer created:', customer.email);
    } else if (!customer.googleId) {
      // Link existing customer account with Google
      customer.googleId = profile.id;
      await customer.save();
      console.log('🔐 Passport: Existing customer linked with Google:', customer.email);
    } else {
      console.log('🔐 Passport: Existing customer with Google found:', customer.email);
    }
    
    // Set userType for customer
    customer.userType = 'customer';
    
    return done(null, customer);
  } catch (error) {
    console.error('🔐 Passport: Error in customer Google OAuth strategy:', error);
    return done(error, null);
  }
}));

// Admin Google OAuth Strategy
passport.use('google-admin', new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_ADMIN_CALLBACK_URL,
  passReqToCallback: true
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    console.log('🔐 Passport: Admin Google OAuth strategy called for:', profile.emails[0].value);
    
    const email = profile.emails[0].value;
    const name = profile.displayName;
    
    // Check if admin already exists (check both collections)
    let admin = await GeneralAdmin.findOne({ email });
    let adminType = 'general_admin';
    
    if (!admin) {
      admin = await MultiVendorAdmin.findOne({ email });
      adminType = 'multi_vendor_admin';
    }
    
    if (!admin) {
      // Create new general admin by default
      admin = new GeneralAdmin({
        name,
        email,
        googleId: profile.id,
        // Generate a random password for Google users
        password: Math.random().toString(36).slice(-16)
      });
      await admin.save();
      console.log('🔐 Passport: New general admin created:', admin.email);
    } else if (!admin.googleId) {
      // Link existing admin account with Google
      admin.googleId = profile.id;
      await admin.save();
      console.log(`🔐 Passport: Existing ${adminType} linked with Google:`, admin.email);
    } else {
      console.log(`🔐 Passport: Existing ${adminType} with Google found:`, admin.email);
    }
    
    // Set userType for admin
    admin.userType = 'admin';
    
    return done(null, admin);
  } catch (error) {
    console.error('🔐 Passport: Error in admin Google OAuth strategy:', error);
    return done(error, null);
  }
}));

// Generate JWT token for vendors
const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, userType: user.userType || 'vendor' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Generate JWT token for customers
const generateCustomerToken = (user) => {
  return jwt.sign(
    { userId: user._id, userType: 'customer' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

// Generate JWT token for admins
const generateAdminToken = (user) => {
  return jwt.sign(
    { userId: user._id, userType: 'admin' },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '7d' }
  );
};

module.exports = { passport, generateToken, generateCustomerToken, generateAdminToken };
