// Simple in-memory token blacklist with user type isolation
// In production, you might want to use Redis or a database for this
const blacklistedTokens = new Map(); // Changed from Set to Map to store user type info

// Add token to blacklist with user type
const addToBlacklist = (token, userType) => {
  blacklistedTokens.set(token, userType);
  console.log('🔐 Token blacklisted:', token.substring(0, 20) + '...', 'userType:', userType);
};

// Check if token is blacklisted for a specific user type
const isBlacklisted = (token, userType) => {
  const blacklistedUserType = blacklistedTokens.get(token);
  if (!blacklistedUserType) {
    return false;
  }
  
  // Only consider it blacklisted if the user types match
  // This prevents customer logout from affecting vendor tokens and vice versa
  return blacklistedUserType === userType;
};

// Remove token from blacklist (for cleanup purposes)
const removeFromBlacklist = (token) => {
  blacklistedTokens.delete(token);
};

// Get blacklist size (for monitoring)
const getBlacklistSize = () => {
  return blacklistedTokens.size;
};

// Clear all blacklisted tokens (for testing/cleanup)
const clearBlacklist = () => {
  blacklistedTokens.clear();
  console.log('🔐 Token blacklist cleared');
};

module.exports = {
  addToBlacklist,
  isBlacklisted,
  removeFromBlacklist,
  getBlacklistSize,
  clearBlacklist
};
