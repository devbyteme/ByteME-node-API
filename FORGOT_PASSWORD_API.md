# Forgot Password API Endpoints

This document outlines the API endpoints needed to implement forgot password functionality for vendors in the ByteMe platform.

## 🔐 **Endpoints Overview**

### 1. **POST /api/auth/forgot-password**
Send a password reset email to the vendor's email address.

**Request Body:**
```json
{
  "email": "vendor@example.com"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password reset email sent successfully",
  "data": {
    "email": "vendor@example.com",
    "resetTokenExpiry": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (Error - 400/404):**
```json
{
  "success": false,
  "message": "Email not found or invalid email address",
  "error": "EMAIL_NOT_FOUND"
}
```

### 2. **POST /api/auth/reset-password**
Reset the vendor's password using the reset token from the email.

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "NewSecurePassword123!"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "email": "vendor@example.com",
    "passwordUpdatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Response (Error - 400/401):**
```json
{
  "success": false,
  "message": "Invalid or expired reset token",
  "error": "INVALID_TOKEN"
}
```

## 🏗️ **Implementation Requirements**

### **Database Schema Updates**

1. **Vendor Model Updates:**
   - Add `resetPasswordToken` field (String)
   - Add `resetPasswordExpires` field (Date)

2. **Password Reset Token Model (Optional):**
   ```javascript
   const passwordResetSchema = new mongoose.Schema({
     email: { type: String, required: true },
     token: { type: String, required: true },
     expiresAt: { type: Date, required: true },
     used: { type: Boolean, default: false }
   });
   ```

### **Email Service Integration**

1. **Email Template for Password Reset:**
   - Subject: "ByteMe - Reset Your Password"
   - Include reset link with token
   - Set expiration time (1 hour)
   - ByteMe branding and styling

2. **Reset Link Format:**
   ```
   https://yourdomain.com/vendor-reset-password?token=RESET_TOKEN_HERE
   ```

### **Security Considerations**

1. **Token Generation:**
   - Use crypto.randomBytes(32) for secure tokens
   - Hash tokens before storing in database
   - Set 1-hour expiration time

2. **Rate Limiting:**
   - Limit forgot password requests to 3 per hour per email
   - Implement CAPTCHA for multiple failed attempts

3. **Token Validation:**
   - Verify token exists and hasn't expired
   - Mark token as used after successful reset
   - Invalidate all previous tokens for the user

## 🔧 **Backend Implementation Steps**

### **Step 1: Update Vendor Model**
```javascript
// models/Vendor.js
const vendorSchema = new mongoose.Schema({
  // ... existing fields
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

// Add method to generate reset token
vendorSchema.methods.generatePasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return resetToken;
};
```

### **Step 2: Create Auth Controller Methods**
```javascript
// controllers/authController.js

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const vendor = await Vendor.findOne({ email });
    
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Email not found"
      });
    }

    const resetToken = vendor.generatePasswordResetToken();
    await vendor.save();

    // Send email with reset token
    await sendPasswordResetEmail(vendor.email, resetToken);

    res.json({
      success: true,
      message: "Password reset email sent successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send reset email"
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const vendor = await Vendor.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    // Update password and clear reset token
    vendor.password = await bcrypt.hash(password, 12);
    vendor.resetPasswordToken = undefined;
    vendor.resetPasswordExpires = undefined;
    await vendor.save();

    res.json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reset password"
    });
  }
};
```

### **Step 3: Add Routes**
```javascript
// routes/authRoutes.js
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
```

### **Step 4: Email Service Integration**
```javascript
// services/emailService.js
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/vendor-reset-password?token=${resetToken}`;
  
  const emailContent = `
    <h2>Reset Your ByteMe Password</h2>
    <p>You requested a password reset for your ByteMe vendor account.</p>
    <p>Click the link below to reset your password:</p>
    <a href="${resetUrl}" style="background: #FE4B11; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
      Reset Password
    </a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  // Send email using your email service (Nodemailer, SendGrid, etc.)
  await sendEmail(email, 'Reset Your ByteMe Password', emailContent);
};
```

## 🧪 **Testing**

### **Test Cases**

1. **Forgot Password:**
   - Valid email → Success response
   - Invalid email → Error response
   - Rate limiting → Block after 3 attempts

2. **Reset Password:**
   - Valid token + password → Success
   - Expired token → Error
   - Invalid token → Error
   - Weak password → Validation error

3. **Security:**
   - Token expiration after 1 hour
   - Token invalidation after use
   - Password strength validation

## 📱 **Frontend Integration**

The frontend is already implemented with:
- ✅ Forgot password page (`/vendor-forgot-password`)
- ✅ Reset password page (`/vendor-reset-password`)
- ✅ API service methods
- ✅ Routing configuration
- ✅ ByteMe branding and styling

## 🚀 **Next Steps**

1. Implement backend API endpoints
2. Set up email service (Nodemailer/SendGrid)
3. Update Vendor model with reset token fields
4. Test complete flow end-to-end
5. Deploy and monitor
