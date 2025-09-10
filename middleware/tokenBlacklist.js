// Simple in-memory token blacklist
// In production, you might want to use Redis or a database for this
const blacklistedTokens = new Set();

// Add token to blacklist
const addToBlacklist = (token) => {
  blacklistedTokens.add(token);
  console.log('🔐 Token blacklisted:', token.substring(0, 20) + '...');
};

// Check if token is blacklisted
const isBlacklisted = (token) => {
  return blacklistedTokens.has(token);
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
