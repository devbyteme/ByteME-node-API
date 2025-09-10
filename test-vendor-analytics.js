// Test script to verify vendor-specific analytics in admin portal
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

async function testVendorAnalytics() {
  console.log('🧪 Testing Vendor-Specific Analytics in Admin Portal\n');

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

    // Step 2: Get vendors list
    console.log('\n2. Getting vendors list...');
    const vendorsResponse = await axios.get(`${API_BASE_URL}/admin/vendors`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (vendorsResponse.data.success) {
      const vendors = vendorsResponse.data.data;
      console.log(`   ✅ Found ${vendors.length} vendors`);
      if (vendors.length > 0) {
        console.log('   📋 Vendors:');
        vendors.forEach((vendor, index) => {
          console.log(`      ${index + 1}. ${vendor.name} (ID: ${vendor._id})`);
        });

        // Step 3: Test vendor-specific dashboard stats
        const testVendor = vendors[0];
        console.log(`\n3. Testing vendor-specific stats for: ${testVendor.name}`);
        
        const vendorStatsResponse = await axios.get(`${API_BASE_URL}/admin/vendor-dashboard-stats/${testVendor._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (vendorStatsResponse.data.success) {
          const vendorStats = vendorStatsResponse.data.data;
          console.log('   ✅ Vendor-specific stats loaded successfully');
          console.log('   📊 Vendor Stats:');
          console.log(`      - Vendor Name: ${vendorStats.vendorName}`);
          console.log(`      - Total Orders: ${vendorStats.totalOrders}`);
          console.log(`      - Total Revenue: $${vendorStats.totalRevenue.toFixed(2)}`);
          console.log(`      - Order Growth: ${vendorStats.growth.orders}%`);
          console.log(`      - Revenue Growth: ${vendorStats.growth.revenue}%`);
        } else {
          console.log('   ❌ Vendor stats failed:', vendorStatsResponse.data.message);
        }

        // Step 4: Test vendor-specific revenue stats
        console.log(`\n4. Testing vendor-specific revenue stats for: ${testVendor.name}`);
        const revenueResponse = await axios.get(`${API_BASE_URL}/admin/revenue-stats?period=7d&vendorId=${testVendor._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (revenueResponse.data.success) {
          console.log('   ✅ Vendor-specific revenue stats loaded successfully');
          const revenueData = revenueResponse.data.data;
          const totalRevenue = revenueData.reduce((sum, day) => sum + day.revenue, 0);
          console.log(`   📈 Total Revenue (7 days): $${totalRevenue.toFixed(2)}`);
          console.log(`   📅 Revenue data points: ${revenueData.length}`);
          
          if (revenueData.length > 0) {
            console.log('   📊 Sample revenue data:', revenueData.slice(0, 3));
          }
        } else {
          console.log('   ❌ Vendor revenue stats failed:', revenueResponse.data.message);
        }

      } else {
        console.log('   ⚠️  No vendors found - create some vendors first');
      }
    } else {
      console.log('   ❌ Failed to get vendors:', vendorsResponse.data.message);
    }

    // Step 5: Test global dashboard stats
    console.log('\n5. Testing global dashboard stats...');
    const dashboardResponse = await axios.get(`${API_BASE_URL}/admin/dashboard-stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (dashboardResponse.data.success) {
      const stats = dashboardResponse.data.data;
      console.log('   ✅ Global dashboard stats loaded successfully');
      console.log('   📊 Global Stats:');
      console.log(`      - Total Vendors: ${stats.totalVendors}`);
      console.log(`      - Total Customers: ${stats.totalCustomers}`);
      console.log(`      - Total Orders: ${stats.totalOrders}`);
      console.log(`      - Total Revenue: $${stats.totalRevenue.toFixed(2)}`);
    } else {
      console.log('   ❌ Global dashboard stats failed:', dashboardResponse.data.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response:', error.response.data);
    }
  }

  console.log('\n📝 Vendor Analytics Fix Summary:');
  console.log('   • Added vendor-specific dashboard stats endpoint');
  console.log('   • Updated admin portal to show vendor-specific data when vendor is selected');
  console.log('   • Stats cards now display vendor-specific metrics');
  console.log('   • Revenue charts filter by selected vendor');
  console.log('   • Global stats shown when "All Vendors" is selected');
  console.log('   • Vendor-specific stats shown when individual vendor is selected');
}

// Run the test
testVendorAnalytics();


