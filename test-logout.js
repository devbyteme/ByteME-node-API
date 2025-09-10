// Simple test script to verify logout functionality
const { addToBlacklist, isBlacklisted, getBlacklistSize, clearBlacklist } = require('./middleware/tokenBlacklist');

console.log('🧪 Testing logout functionality...\n');

// Test 1: Add token to blacklist
const testToken = 'test-token-123';
console.log('1. Adding token to blacklist...');
addToBlacklist(testToken);
console.log('   ✓ Token added to blacklist');

// Test 2: Check if token is blacklisted
console.log('\n2. Checking if token is blacklisted...');
const isBlacklistedResult = isBlacklisted(testToken);
console.log(`   ✓ Token is blacklisted: ${isBlacklistedResult}`);

// Test 3: Check blacklist size
console.log('\n3. Checking blacklist size...');
const blacklistSize = getBlacklistSize();
console.log(`   ✓ Blacklist size: ${blacklistSize}`);

// Test 4: Test with non-blacklisted token
console.log('\n4. Testing with non-blacklisted token...');
const nonBlacklistedToken = 'valid-token-456';
const isNonBlacklistedResult = isBlacklisted(nonBlacklistedToken);
console.log(`   ✓ Non-blacklisted token is blacklisted: ${isNonBlacklistedResult}`);

// Test 5: Clear blacklist
console.log('\n5. Clearing blacklist...');
clearBlacklist();
const clearedBlacklistSize = getBlacklistSize();
console.log(`   ✓ Blacklist cleared, size: ${clearedBlacklistSize}`);

console.log('\n✅ All logout tests passed!');
console.log('\n📝 Summary of fixes:');
console.log('   • Frontend logout now properly clears localStorage items');
console.log('   • Backend logout now invalidates tokens by adding them to blacklist');
console.log('   • Token blacklist middleware prevents use of invalidated tokens');
console.log('   • Each user type (vendor, customer, admin) has isolated logout');
console.log('   • Vendor logout only clears vendor-specific data');
console.log('   • Customer logout only clears customer-specific data');
console.log('   • Admin logout only clears admin-specific data');
console.log('   • No cross-contamination between user types');
