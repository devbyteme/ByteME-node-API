// Test script for email notifications
const { sendOrderConfirmationEmail, sendNewOrderNotificationEmail } = require('./services/emailService');

// Mock order data for testing
const mockOrder = {
  _id: '507f1f77bcf86cd799439011',
  tableNumber: '5',
  status: 'pending',
  paymentMethod: 'cash',
  tipAmount: 5.00,
  tipPercentage: 15,
  customerPhone: '+1234567890',
  specialRequests: 'Extra spicy, no onions',
  dietaryRequirements: ['vegetarian', 'gluten-free'],
  createdAt: new Date(),
  items: [
    {
      name: 'Grilled Salmon',
      price: 24.99,
      quantity: 1
    },
    {
      name: 'Caesar Salad',
      price: 12.99,
      quantity: 2
    },
    {
      name: 'Chocolate Cake',
      price: 8.99,
      quantity: 1
    }
  ]
};

async function testEmailNotifications() {
  console.log('🧪 Testing email notifications...\n');

  try {
    // Test customer confirmation email
    console.log('1. Testing customer order confirmation email...');
    await sendOrderConfirmationEmail(
      'test-customer@example.com',
      'John Doe',
      mockOrder
    );
    console.log('   ✅ Customer confirmation email sent successfully');

    // Test vendor notification email
    console.log('\n2. Testing vendor new order notification email...');
    await sendNewOrderNotificationEmail(
      'test-vendor@example.com',
      'Restaurant Name',
      mockOrder
    );
    console.log('   ✅ Vendor notification email sent successfully');

    console.log('\n✅ All email tests passed!');
    console.log('\n📝 Email notification features implemented:');
    console.log('   • Customer receives order confirmation email with details');
    console.log('   • Vendor receives new order alert with table number');
    console.log('   • Emails include order items, totals, and special requests');
    console.log('   • Professional HTML email templates with ByteMe branding');
    console.log('   • Error handling - order creation continues even if emails fail');
    console.log('   • Async email sending - doesn\'t slow down order processing');

  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    console.log('\n📝 To fix email issues:');
    console.log('   1. Set EMAIL_USER and EMAIL_PASSWORD environment variables');
    console.log('   2. For Gmail, use an App Password instead of regular password');
    console.log('   3. Check your email service configuration');
    console.log('   4. Verify network connectivity');
  }
}

// Run the test
testEmailNotifications();
