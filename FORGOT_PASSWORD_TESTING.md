# Forgot Password Testing Guide

This guide covers testing the complete forgot password flow for the ByteMe platform.

## 🧪 **Testing Checklist**

### **Frontend Testing**
- [ ] Forgot password page loads without sidebar
- [ ] Email input validation works
- [ ] Form submission shows loading state
- [ ] Success message displays correctly
- [ ] Error handling works for invalid emails
- [ ] Resend email functionality works
- [ ] Navigation between pages works correctly

### **Backend Testing**
- [ ] Forgot password endpoint responds correctly
- [ ] Reset password endpoint works with valid tokens
- [ ] Rate limiting prevents abuse
- [ ] Email service sends emails correctly
- [ ] Token expiration works (1 hour)
- [ ] Password validation enforces requirements

## 🔐 **API Endpoint Testing**

### **1. Test Forgot Password Endpoint**

```bash
# Test with valid email format
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"vendor@example.com"}'

# Expected Response:
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent"
}

# Test with invalid email format
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email"}'

# Expected Response:
{
  "success": false,
  "message": "Email is required"
}
```

### **2. Test Rate Limiting**

```bash
# Make multiple requests quickly (should be limited to 3 per hour)
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/auth/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
  echo "Request $i"
  sleep 1
done

# After 3 requests, should get rate limit error:
{
  "success": false,
  "message": "Too many password reset requests. Please try again later.",
  "error": "RATE_LIMIT_EXCEEDED"
}
```

### **3. Test Reset Password Endpoint**

```bash
# Test with valid token and password
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "VALID_TOKEN_HERE",
    "password": "NewSecurePassword123!"
  }'

# Expected Response:
{
  "success": true,
  "message": "Password reset successfully",
  "data": {
    "email": "vendor@example.com",
    "passwordUpdatedAt": "2024-01-15T10:30:00.000Z"
  }
}

# Test with weak password
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "VALID_TOKEN_HERE",
    "password": "weak"
  }'

# Expected Response:
{
  "success": false,
  "message": "Password must be at least 8 characters long"
}
```

## 📧 **Email Testing**

### **Gmail Setup (Development)**

1. **Enable 2-Factor Authentication**
   - Go to Google Account Settings
   - Security → 2-Step Verification → Turn on

2. **Generate App Password**
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and "Other (Custom name)"
   - Name it "ByteMe Development"
   - Copy the generated 16-character password

3. **Update .env file**
   ```bash
   EMAIL_SERVICE=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-16-char-app-password
   EMAIL_FROM=ByteMe <noreply@byteme.com>
   FRONTEND_URL=http://localhost:5173
   ```

### **Test Email Sending**

1. **Start the server**
   ```bash
   npm run dev
   ```

2. **Request password reset**
   ```bash
   curl -X POST http://localhost:3000/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email@gmail.com"}'
   ```

3. **Check email inbox**
   - Look for "ByteMe - Reset Your Password" email
   - Verify reset link contains token
   - Test clicking the reset link

## 🔄 **Complete Flow Testing**

### **Step 1: Request Password Reset**
1. Navigate to `/vendor-forgot-password`
2. Enter a valid vendor email
3. Submit form
4. Verify success message appears
5. Check email for reset link

### **Step 2: Reset Password**
1. Click reset link in email
2. Verify redirect to `/vendor-reset-password?token=...`
3. Enter new password (meeting requirements)
4. Confirm password
5. Submit form
6. Verify success message and redirect

### **Step 3: Login with New Password**
1. Navigate to `/vendor-login`
2. Enter email and new password
3. Verify successful login
4. Check dashboard access

## 🐛 **Common Issues & Solutions**

### **Email Not Sending**
- Check Gmail app password is correct
- Verify 2FA is enabled
- Check server logs for email errors
- Ensure `.env` variables are set correctly

### **Token Expired**
- Tokens expire after 1 hour
- Request new reset link
- Check server time is correct

### **Rate Limiting**
- Wait 1 hour for rate limit to reset
- Use different IP address for testing
- Check rate limit configuration

### **Password Validation**
- Must be 8+ characters
- Include uppercase, lowercase, number, special character
- Check frontend validation matches backend

## 📱 **Frontend Integration Testing**

### **Test Scenarios**
1. **Happy Path**: Complete password reset flow
2. **Error Handling**: Invalid emails, expired tokens
3. **Loading States**: Form submission, email sending
4. **Navigation**: Between forgot password, reset, and login pages
5. **Responsive Design**: Test on mobile and desktop
6. **Accessibility**: Keyboard navigation, screen readers

### **Browser Testing**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## 🚀 **Production Deployment Checklist**

- [ ] Update environment variables
- [ ] Configure production email service
- [ ] Set up monitoring and logging
- [ ] Test rate limiting in production
- [ ] Verify email delivery rates
- [ ] Monitor for abuse/security issues
- [ ] Set up backup email service
- [ ] Document production configuration

## 📊 **Performance Testing**

### **Load Testing**
```bash
# Test with multiple concurrent requests
ab -n 100 -c 10 -p test-data.json \
  -T application/json \
  http://localhost:3000/api/auth/forgot-password
```

### **Response Time Targets**
- Forgot password: < 2 seconds
- Reset password: < 1 second
- Email delivery: < 30 seconds

## 🔒 **Security Testing**

- [ ] Token generation is cryptographically secure
- [ ] Tokens expire correctly
- [ ] Rate limiting prevents abuse
- [ ] No information leakage about email existence
- [ ] Password requirements are enforced
- [ ] CSRF protection is in place
- [ ] Input validation prevents injection attacks
