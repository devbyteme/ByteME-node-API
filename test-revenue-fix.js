// Test script to verify admin portal revenue calculation
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testRevenueCalculation() {
  console.log('🧪 Testing Admin Portal Revenue Calculation\n');

  try {
    // Step 1: Test admin login
    console.log('1. Testing admin login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/admin/login`, {
      email: 'admin@byteme.com',
      password: 'admin123'
    });

    if (!loginResponse.data.success) {
      console.log('   ❌ Admin login failed:', loginResponse.data.message);
      console.log('   💡 Please create an admin account first');
      return;
    }

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
      const stats = dashboardResponse.data.data;
      console.log('   ✅ Dashboard stats loaded successfully');
      console.log('   📊 Dashboard Data:');
      console.log(`      - Total Vendors: ${stats.totalVendors}`);
      console.log(`      - Total Customers: ${stats.totalCustomers}`);
      console.log(`      - Total Orders: ${stats.totalOrders}`);
      console.log(`      - Total Revenue: $${stats.totalRevenue.toFixed(2)}`);
      console.log(`      - Revenue Growth: ${stats.growth.revenue}%`);
      
      if (stats.totalRevenue > 0) {
        console.log('   ✅ Revenue is showing correctly!');
      } else {
        console.log('   ⚠️  Revenue is still 0 - this might be expected if no orders exist');
      }
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
      const revenueData = revenueResponse.data.data;
      const totalRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0);
      console.log(`   📈 Total Revenue (7 days): $${totalRevenue.toFixed(2)}`);
      console.log(`   📅 Revenue data points: ${revenueData.length}`);
      
      if (revenueData.length > 0) {
        console.log('   📊 Sample revenue data:', revenueData.slice(0, 3));
      }
    } else {
      console.log('   ❌ Revenue stats failed:', revenueResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }

  console.log('\n📝 Revenue Fix Summary:');
  console.log('   • Modified admin dashboard to include ALL orders (not just paid ones)');
  console.log('   • Added payment status update endpoint for vendors');
  console.log('   • Orders are now marked as paid when status changes to "served"');
  console.log('   • Added detailed logging for debugging');
  console.log('   • Revenue should now show for all registered vendors');
}

// Run the test
testRevenueCalculation();
