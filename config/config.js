// Backend Configuration
module.exports = {
  // Server settings
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MongoDB settings
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/byteme',
  
  // JWT settings
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  
  // CORS settings
  corsOrigins: [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  
  // API settings
  apiPrefix: '/api',
  
  // Security settings
  bcryptRounds: 12,
  
  // Rate limiting
  rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  rateLimitMax: 100 // limit each IP to 100 requests per windowMs
}; 