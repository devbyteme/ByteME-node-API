# Customer Google OAuth 403 Error - Fixed

## Problem
When customers tried to log in using Google OAuth, they received a **403 Forbidden** error at the callback URL:
```
GET http://localhost:3000/api/auth/google/customer/callback?state=...&code=... 403 (Forbidden)
```

## Root Causes Identified

### 1. **Relative Callback URL in Passport Strategy**
The customer Google OAuth strategy was using a relative path for the `callbackURL`:
```javascript
callbackURL: "/api/auth/google/customer/callback"
```

This caused issues because:
- Google OAuth requires an **absolute URL** for the callback
- The vendor strategy was correctly using `process.env.GOOGLE_CALLBACK_URL` (absolute URL)
- The mismatch between relative and absolute URLs can cause authentication failures

### 2. **Missing Error Handling in Callback Route**
The callback route didn't have proper error handling to catch and report authentication failures.

### 3. **State Parameter Conflict** (CRITICAL)
The Passport Google OAuth strategy had `state: true` which generates a random CSRF token and **overwrites** the custom state parameter containing the redirect URL. This caused:
- The frontend's redirect URL (stored in state parameter) to be lost
- Malformed redirect URLs like `/api/auth/google/customer/randomstring&token=...`
- 404 errors because the redirect went to a non-existent backend endpoint

## Solutions Implemented

### Fix 1: Use Absolute URL for Customer Callback
**File:** `ByteMe-Node-API/config/passport.js`

Changed from:
```javascript
callbackURL: "/api/auth/google/customer/callback"
```

To:
```javascript
callbackURL: process.env.GOOGLE_CUSTOMER_CALLBACK_URL || "http://localhost:3000/api/auth/google/customer/callback"
```

**Benefits:**
- Uses environment variable for production flexibility
- Falls back to localhost for development
- Matches the pattern used for vendor OAuth
- Provides an absolute URL that Google OAuth expects

### Fix 2: Remove State Parameter Conflict (CRITICAL FIX)
**File:** `ByteMe-Node-API/config/passport.js`

Removed `state: true` from the strategy configuration:
```javascript
// BEFORE (WRONG)
passport.use('google-customer', new GoogleStrategy({
  state: true,  // ❌ This overwrites our custom state parameter
  ...
}));

// AFTER (CORRECT)
passport.use('google-customer', new GoogleStrategy({
  // ✅ No state: true - we handle state manually via session
  ...
}));
```

### Fix 3: Store Redirect URL in Session
**File:** `ByteMe-Node-API/routes/authRoutes.js`

Added middleware to store the redirect URL in session before OAuth:
```javascript
router.get('/google/customer', (req, res, next) => {
  // Store redirect URL in session (survives OAuth flow)
  if (req.query.state) {
    req.session.oauth_redirect_url = decodeURIComponent(req.query.state);
    console.log('🔐 OAuth Init: Storing redirect URL in session');
  }
  passport.authenticate('google-customer', { 
    scope: ['profile', 'email'],
    passReqToCallback: true
  })(req, res, next);
});
```

### Fix 4: Retrieve Redirect URL from Session in Callback
**File:** `ByteMe-Node-API/controllers/authController.js`

Changed to retrieve redirect URL from session instead of state parameter:
```javascript
// BEFORE (WRONG)
const stateParam = req.query?.state; // ❌ This gets overwritten by Passport
const decodedState = decodeURIComponent(stateParam);

// AFTER (CORRECT)
const redirectUrl = req.session?.oauth_redirect_url; // ✅ Retrieved from session
if (req.session?.oauth_redirect_url) {
  delete req.session.oauth_redirect_url; // Clean up
}
```

### Fix 5: Add Comprehensive Error Handling
**File:** `ByteMe-Node-API/routes/authRoutes.js`

Changed from:
```javascript
router.get('/google/customer/callback', 
  passport.authenticate('google-customer', { session: false }), 
  customerGoogleCallback
);
```

To:
```javascript
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
```

**Benefits:**
- Catches authentication errors and logs them
- Provides user-friendly error messages
- Redirects users back to the auth page with error details
- Makes debugging much easier

## Environment Variables

Make sure your `.env` file has:

```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
GOOGLE_CUSTOMER_CALLBACK_URL=http://localhost:3000/api/auth/google/customer/callback

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

## Google Cloud Console Configuration

Ensure your Google OAuth 2.0 credentials have **BOTH** callback URLs registered:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services > Credentials**
3. Edit your OAuth 2.0 Client ID
4. Under **Authorized redirect URIs**, ensure you have:
   - `http://localhost:3000/api/auth/google/callback` (for vendors)
   - `http://localhost:3000/api/auth/google/customer/callback` (for customers)
5. Save changes

## Testing the Fix

### 1. Restart the Backend
```bash
npm start
```

### 2. Test Customer Google OAuth Flow
1. Navigate to the customer menu (scan QR code or use direct link)
2. Click on "Login/Register" to go to customer auth page
3. Click "Continue with Google"
4. Select your Google account
5. You should be redirected back to the menu with authentication successful

### 3. Verify in Console
You should see these logs in the backend:
```
🔐 Passport: Customer Google OAuth strategy called for: user@example.com
🔐 Passport: New customer created: user@example.com (or Existing customer found)
🔐 Backend: Customer Google OAuth callback triggered
🔐 Backend: User data: user@example.com userType: customer
🔐 Backend: Customer JWT token generated with userType: customer
```

## What Happens After Successful OAuth

1. **Google authenticates the user** and redirects to the callback URL
2. **Passport strategy** creates or finds the customer account
3. **Backend generates a JWT token** with `userType: 'customer'`
4. **Backend redirects** to the customer menu with:
   - `token` - JWT authentication token
   - `googleAuth=true` - Flag indicating Google OAuth was used
   - `userData` - Encoded user profile data
5. **Frontend stores** the token and user data
6. **Customer is authenticated** and can browse menu and place orders

## Troubleshooting

### Still Getting 403 Error?
1. **Check Google Cloud Console**: Ensure the customer callback URL is registered
2. **Check Environment Variables**: Verify `GOOGLE_CUSTOMER_CALLBACK_URL` is set correctly
3. **Check Backend Logs**: Look for error messages starting with `🔐`
4. **Clear Browser Cache**: Sometimes old OAuth sessions can cause issues
5. **Try Incognito Mode**: Rules out browser extension issues

### Error: "Authentication failed - no user"
- This means Passport couldn't create/find the user account
- Check MongoDB connection
- Check User model schema
- Look for errors in backend logs

### Error: "Invalid user type for customer authentication"
- The user was created but `userType` wasn't set to 'customer'
- This shouldn't happen with the current code
- Report this as a bug if it occurs

## Production Deployment

For production, update:

1. **Environment Variables**:
```env
GOOGLE_CUSTOMER_CALLBACK_URL=https://yourdomain.com/api/auth/google/customer/callback
FRONTEND_URL=https://yourdomain.com
```

2. **Google Cloud Console**:
   - Add production callback URL: `https://yourdomain.com/api/auth/google/customer/callback`
   - Update OAuth consent screen with production domain

3. **HTTPS Required**:
   - Google OAuth requires HTTPS in production
   - Ensure your server has a valid SSL certificate

## Summary

The 403 error was caused by using a relative URL for the OAuth callback instead of an absolute URL. By changing to use `process.env.GOOGLE_CUSTOMER_CALLBACK_URL` with a fallback to an absolute localhost URL, and adding proper error handling, the customer Google OAuth flow now works correctly.

The fix ensures:
✅ Proper OAuth callback URL handling
✅ Comprehensive error logging and handling
✅ User-friendly error messages
✅ Consistent pattern with vendor OAuth
✅ Production-ready configuration

---
**Fixed on:** October 6, 2025
**Last Updated:** October 6, 2025

