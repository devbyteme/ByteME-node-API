// Test script for Admin Portal API endpoints
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test admin login and dashboard stats
async function testAdminAPI() {
  console.log('🧪 Testing Admin Portal API Endpoints\n');

  try {
    // Step 1: Test admin login
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/admin/login`, {
      email: 'admin@byteme.com', // Replace with actual admin email
      password: 'admin123' // Replace with actual admin password
    });

    if (loginResponse.data.success) {
      console.log('   ✅ Admin login successful');
      const token = loginResponse.data.token;
      
      // Step 2: Test dashboard stats
      console.log('\n2. Testing dashboard stats...');
      const dashboardResponse = await axios.get(`${API_BASE_URL}/admin/dashboard-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (dashboardResponse.data.success) {
        console.log('   ✅ Dashboard stats loaded successfully');
        console.log('   📊 Dashboard Data:', JSON.stringify(dashboardResponse.data.data, null, 2));
      } else {
        console.log('   ❌ Dashboard stats failed:', dashboardResponse.data.message);
      }

      // Step 3: Test revenue stats
      console.log('\n3. Testing revenue stats...');
      const revenueResponse = await axios.get(`${API_BASE_URL}/admin/revenue-stats?period=7d&vendorId=all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (revenueResponse.data.success) {
        console.log('   ✅ Revenue stats loaded successfully');
        console.log('   📈 Revenue Data (first 3 entries):', JSON.stringify(revenueResponse.data.data.slice(0, 3), null, 2));
      } else {
        console.log('   ❌ Revenue stats failed:', revenueResponse.data.message);
      }

      // Step 4: Test vendors list
      console.log('\n4. Testing vendors list...');
      const vendorsResponse = await axios.get(`${API_BASE_URL}/admin/vendors`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (vendorsResponse.data.success) {
        console.log('   ✅ Vendors list loaded successfully');
        console.log('   🏪 Vendors count:', vendorsResponse.data.data.length);
      } else {
        console.log('   ❌ Vendors list failed:', vendorsResponse.data.message);
      }

    } else {
      console.log('   ❌ Admin login failed:', loginResponse.data.message);
      console.log('   💡 Make sure you have an admin account created');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }

  console.log('\n📝 Admin Portal API Test Summary:');
  console.log('   • Dashboard stats should show total revenue and growth');
  console.log('   • Revenue stats should show daily revenue trends');
  console.log('   • All endpoints should require admin authentication');
  console.log('   • Check server logs for detailed debugging information');
}

// Run the test
testAdminAPI();
