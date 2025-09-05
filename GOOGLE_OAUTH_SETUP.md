# Google OAuth Setup Guide

This guide will help you set up Google OAuth authentication for the ByteMe Restaurant Management System.

## Prerequisites

1. A Google Cloud Platform account
2. Node.js and npm installed
3. MongoDB running locally or remotely

## Step 1: Create Google OAuth Credentials

### 1.1 Go to Google Cloud Console
- Visit [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select an existing one

### 1.2 Enable Google+ API
- Go to "APIs & Services" > "Library"
- Search for "Google+ API" and enable it
- Also enable "Google OAuth2 API" if available

### 1.3 Create OAuth 2.0 Credentials
- Go to "APIs & Services" > "Credentials"
- Click "Create Credentials" > "OAuth 2.0 Client IDs"
- Choose "Web application" as the application type

### 1.4 Configure OAuth Consent Screen
- Set application name (e.g., "ByteMe Restaurant Management")
- Add your email as developer contact
- Add scopes: `email` and `profile`
- Add test users if needed

### 1.5 Set Authorized Redirect URIs
Add these redirect URIs:
- `http://localhost:3000/api/auth/google/callback` (for development)
- `https://yourdomain.com/api/auth/google/callback` (for production)

### 1.6 Copy Credentials
- Copy the **Client ID** and **Client Secret**
- You'll need these for the next step

## Step 2: Configure Environment Variables

### 2.1 Create .env file
Copy the example environment file:
```bash
cp env.example .env
```

### 2.2 Update .env file
Edit `.env` and add your Google credentials:
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Other required variables
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
FRONTEND_URL=http://localhost:5173
```

## Step 3: Install Dependencies

Make sure all required packages are installed:
```bash
npm install
```

## Step 4: Start the Backend

```bash
npm start
```

The server should start on `http://localhost:3000`

## Step 5: Test Google OAuth

### 5.1 Frontend Integration
The frontend is already configured to work with Google OAuth. Users can:
- Click "Continue with Google" on the vendor login page
- Be redirected to Google for authentication
- Return to the application with a JWT token

### 5.2 Test Flow
1. Open your frontend application
2. Go to `/vendor-login`
3. Click "Continue with Google"
4. Complete Google authentication
5. You should be redirected back with a token

## Security Features

### JWT Authentication
- All dashboard routes are protected with JWT tokens
- Tokens expire after 7 days
- Automatic token refresh capability

### Route Protection
- Dashboard routes require vendor authentication
- Public routes remain accessible
- Automatic redirect to login for unauthenticated users

### Session Management
- Secure session configuration
- HTTP-only cookies
- CSRF protection through JWT

## Troubleshooting

### Common Issues

#### 1. "Invalid redirect URI" Error
- Check that your redirect URI in Google Console matches exactly
- Ensure no trailing slashes or extra characters

#### 2. "Client ID not found" Error
- Verify your `GOOGLE_CLIENT_ID` in `.env`
- Restart the server after changing environment variables

#### 3. CORS Errors
- Check that your frontend URL is in the CORS configuration
- Verify `FRONTEND_URL` in your `.env` file

#### 4. Database Connection Issues
- Ensure MongoDB is running
- Check your `MONGODB_URI` in `.env`

### Debug Mode
Enable debug logging by setting:
```env
NODE_ENV=development
```

## Production Deployment

### 1. Update Environment Variables
```env
NODE_ENV=production
GOOGLE_CLIENT_ID=your-production-client-id
GOOGLE_CLIENT_SECRET=your-production-client-secret
FRONTEND_URL=https://yourdomain.com
```

### 2. Update Google OAuth Settings
- Add your production domain to authorized redirect URIs
- Update OAuth consent screen with production information

### 3. Security Considerations
- Use strong, unique JWT and session secrets
- Enable HTTPS in production
- Consider implementing rate limiting
- Monitor authentication logs

## API Endpoints

### Authentication Routes
- `POST /api/auth/vendor/register` - Vendor registration
- `POST /api/auth/vendor/login` - Vendor login
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh JWT token

### Protected Routes
All dashboard routes require valid JWT token:
- `/dashboard` - Main dashboard
- `/menu-management` - Menu management
- `/orders` - Order management
- `/qr-generator` - QR code generation
- `/analytics` - Analytics and reports

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify all environment variables are set correctly
3. Ensure Google OAuth credentials are properly configured
4. Check that all dependencies are installed

## Next Steps

After successful Google OAuth setup:
1. Test the complete authentication flow
2. Customize the OAuth consent screen
3. Add additional OAuth providers if needed
4. Implement user profile management
5. Add password reset functionality
