# Environment Variables Configuration

Create a `.env` file in the root directory with the following variables:

## 🔐 **Required Environment Variables**

```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/byteme

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=24h

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
GOOGLE_CUSTOMER_CALLBACK_URL=http://localhost:3000/api/auth/google/customer/callback

# Email Service Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=ByteMe <noreply@byteme.com>

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## 📧 **Email Service Setup**

### **For Gmail (Development):**
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the generated password as `EMAIL_PASSWORD`

### **For Production:**
- **SendGrid**: Use `EMAIL_SERVICE=sendgrid` and API key as password
- **AWS SES**: Use `EMAIL_SERVICE=ses` and AWS credentials
- **Custom SMTP**: Use `EMAIL_SERVICE=smtp` with your server details

## 🚀 **Quick Setup**

1. Copy the variables above
2. Create `.env` file in project root
3. Fill in your actual values
4. Restart the server

## 🔒 **Security Notes**

- Never commit `.env` file to version control
- Use strong, unique JWT secrets
- Rotate email passwords regularly
- Use environment-specific configurations
