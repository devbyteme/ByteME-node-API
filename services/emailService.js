const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Create transporter for email sending
const createTransporter = () => {
  // For development, use Gmail or create a test account
  // For production, use services like SendGrid, AWS SES, or your own SMTP server
  
  //for testing
  // return nodemailer.createTransport({
  //   host: process.env.EMAIL_HOST,
  //   port: process.env.EMAIL_PORT,
  //   secure: false, // MailHog uses plain SMTP
  // });

  if (process.env.NODE_ENV === 'production') {
    // Production email service (SendGrid, AWS SES, etc.)
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

  } else {
    // Development - Gmail with app password
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASSWORD || 'your-app-password'
      }
    });

  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, resetToken) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/vendor-reset-password?token=${resetToken}`;
    
    const emailContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your ByteMe Password</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #FE4B11;
            margin-bottom: 10px;
          }
          .tagline {
            color: #666;
            font-size: 14px;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          .reset-button {
            display: inline-block;
            background: #FE4B11;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ByteMe</div>
          <div class="tagline">Digital Dining Solutions</div>
        </div>
        
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>Hello!</p>
          <p>You requested a password reset for your ByteMe vendor account.</p>
          <p>Click the button below to reset your password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="reset-button">
              Reset Password
            </a>
          </div>
          
          <div class="warning">
            <strong>Important:</strong> This link will expire in 1 hour for security reasons.
          </div>
          
          <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          
          <p>If you have any questions, please contact our support team.</p>
        </div>
        
        <div class="footer">
          <p>This email was sent from ByteMe - Digital Dining Solutions</p>
          <p>© 2024 ByteMe. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'ByteMe <noreply@byteme.com>',
      to: email,
      subject: 'ByteMe - Reset Your Password',
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

// Send welcome email for vendors
const sendVendorWelcomeEmail = async (email, vendorName) => {
  try {
    const transporter = createTransporter();
    
    const emailContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ByteMe!</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #FE4B11;
            margin-bottom: 10px;
          }
          .tagline {
            color: #666;
            font-size: 14px;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          .welcome-button {
            display: inline-block;
            background: #FE4B11;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ByteMe</div>
          <div class="tagline">Digital Dining Solutions</div>
        </div>
        
        <div class="content">
          <h2>Welcome to ByteMe, ${vendorName}!</h2>
          <p>Thank you for joining our platform. We're excited to help you streamline your restaurant operations.</p>
          
          <p>With ByteMe, you can:</p>
          <ul>
            <li>Create digital menus with QR codes</li>
            <li>Manage orders in real-time</li>
            <li>Track analytics and insights</li>
            <li>Enhance customer experience</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/vendor-login" class="welcome-button">
              Access Your Dashboard
            </a>
          </div>
          
          <p>If you have any questions, our support team is here to help!</p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
          <p>© 2024 ByteMe. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'ByteMe <noreply@byteme.com>',
      to: email,
      subject: 'Welcome to ByteMe - Your Restaurant Management Platform',
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Vendor welcome email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending vendor welcome email:', error);
    throw error;
  }
};

// Send welcome email for customers
const sendCustomerWelcomeEmail = async (email, customerName) => {
  try {
    const transporter = createTransporter();
    
    const emailContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ByteMe!</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #FE4B11;
            margin-bottom: 10px;
          }
          .tagline {
            color: #666;
            font-size: 14px;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          .welcome-button {
            display: inline-block;
            background: #FE4B11;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ByteMe</div>
          <div class="tagline">Digital Dining Solutions</div>
        </div>
        
        <div class="content">
          <h2>Welcome to ByteMe, ${customerName}!</h2>
          <p>Thank you for joining ByteMe! We're excited to have you as part of our digital dining community.</p>
          
          <p>With ByteMe, you can:</p>
          <ul>
            <li>Browse digital menus with QR codes</li>
            <li>Place orders easily from your phone</li>
            <li>Track your order status in real-time</li>
            <li>Save your favorite restaurants and dishes</li>
            <li>Set dietary preferences and restrictions</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/customer-menu" class="welcome-button">
              Start Exploring
            </a>
          </div>
          
          <p>If you have any questions, our support team is here to help!</p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
          <p>© 2024 ByteMe. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'ByteMe <noreply@byteme.com>',
      to: email,
      subject: 'Welcome to ByteMe - Your Digital Dining Experience',
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Customer welcome email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending customer welcome email:', error);
    throw error;
  }
};

// Send welcome email for admins
const sendAdminWelcomeEmail = async (email, adminName) => {
  try {
    const transporter = createTransporter();
    
    const emailContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ByteMe Admin!</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #FE4B11;
            margin-bottom: 10px;
          }
          .tagline {
            color: #666;
            font-size: 14px;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          .welcome-button {
            display: inline-block;
            background: #FE4B11;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ByteMe</div>
          <div class="tagline">Digital Dining Solutions</div>
        </div>
        
        <div class="content">
          <h2>Welcome to ByteMe Admin, ${adminName}!</h2>
          <p>Thank you for joining our admin team. You now have access to powerful platform management tools.</p>
          
          <p>As an admin, you can:</p>
          <ul>
            <li>Monitor platform analytics and performance</li>
            <li>Manage vendor accounts and approvals</li>
            <li>Track customer engagement and orders</li>
            <li>Generate comprehensive reports</li>
            <li>Configure system settings and policies</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${process.env.ADMIN_FRONTEND_URL || 'http://localhost:3002'}/login" class="welcome-button">
              Access Admin Dashboard
            </a>
          </div>
          
          <p>If you have any questions, please contact the system administrator.</p>
        </div>
        
        <div style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
          <p>© 2024 ByteMe. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'ByteMe <noreply@byteme.com>',
      to: email,
      subject: 'Welcome to ByteMe Admin Portal',
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Admin welcome email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending admin welcome email:', error);
    throw error;
  }
};

// Send order confirmation email to customer
const sendOrderConfirmationEmail = async (customerEmail, customerName, orderData) => {
  try {
    const transporter = createTransporter();
    
    const orderItems = orderData.items.map(item => 
      `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`
    ).join('');
    
    const subtotal = orderData.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const total = subtotal + (orderData.tipAmount || 0);
    
    const emailContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - ByteMe</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #FE4B11;
            margin-bottom: 10px;
          }
          .tagline {
            color: #666;
            font-size: 14px;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          .order-details {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .order-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          .order-table th {
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #dee2e6;
            font-weight: bold;
          }
          .order-table td {
            padding: 10px;
            border-bottom: 1px solid #eee;
          }
          .total-section {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
          }
          .status-badge {
            display: inline-block;
            background: #28a745;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ByteMe</div>
          <div class="tagline">Digital Dining Solutions</div>
        </div>
        
        <div class="content">
          <h2>Thank you for your order, ${customerName || 'Valued Customer'}!</h2>
          <p>Your order has been received and is being prepared. Here are the details:</p>
          
          <div class="order-details">
            <h3>Order #${orderData._id.toString().slice(-8).toUpperCase()}</h3>
            <p><strong>Table:</strong> ${orderData.tableNumber}</p>
            <p><strong>Status:</strong> <span class="status-badge">${orderData.status}</span></p>
            <p><strong>Order Time:</strong> ${new Date(orderData.createdAt).toLocaleString()}</p>
            ${orderData.customerPhone ? `<p><strong>Phone:</strong> ${orderData.customerPhone}</p>` : ''}
            ${orderData.specialRequests ? `<p><strong>Special Requests:</strong> ${orderData.specialRequests}</p>` : ''}
            ${orderData.dietaryRequirements && orderData.dietaryRequirements.length > 0 ? 
              `<p><strong>Dietary Requirements:</strong> ${orderData.dietaryRequirements.join(', ')}</p>` : ''}
          </div>
          
          <div class="order-details">
            <h3>Order Items</h3>
            <table class="order-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderItems}
              </tbody>
            </table>
            
            <div class="total-section">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              ${orderData.tipAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span>Tip (${orderData.tipPercentage}%):</span>
                  <span>$${orderData.tipAmount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 2px solid #dee2e6; padding-top: 10px;">
                <span>Total:</span>
                <span>$${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <p>We'll notify you when your order is ready. Thank you for choosing ByteMe!</p>
        </div>
        
        <div class="footer">
          <p>This email was sent from ByteMe - Digital Dining Solutions</p>
          <p>© 2024 ByteMe. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'ByteMe <noreply@byteme.com>',
      to: customerEmail,
      subject: `Order Confirmation #${orderData._id.toString().slice(-8).toUpperCase()} - ByteMe`,
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw error;
  }
};

// Send new order notification email to vendor
const sendNewOrderNotificationEmail = async (vendorEmail, vendorName, orderData) => {
  try {
    const transporter = createTransporter();
    
    const orderItems = orderData.items.map(item => 
      `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`
    ).join('');
    
    const subtotal = orderData.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const total = subtotal + (orderData.tipAmount || 0);
    
    const emailContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order Alert - ByteMe</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            color: #FE4B11;
            margin-bottom: 10px;
          }
          .tagline {
            color: #666;
            font-size: 14px;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 20px;
          }
          .alert-banner {
            background: #dc3545;
            color: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 20px;
          }
          .order-details {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .order-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
          }
          .order-table th {
            background: #f8f9fa;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #dee2e6;
            font-weight: bold;
          }
          .order-table td {
            padding: 10px;
            border-bottom: 1px solid #eee;
          }
          .total-section {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-top: 20px;
          }
          .action-button {
            display: inline-block;
            background: #FE4B11;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">ByteMe</div>
          <div class="tagline">Digital Dining Solutions</div>
        </div>
        
        <div class="content">
          <div class="alert-banner">
            🚨 NEW ORDER RECEIVED! 🚨
          </div>
          
          <h2>New Order Alert for ${vendorName}!</h2>
          <p>A new order has been placed and requires your attention.</p>
          
          <div class="order-details">
            <h3>Order #${orderData._id.toString().slice(-8).toUpperCase()}</h3>
            <p><strong>Table:</strong> ${orderData.tableNumber}</p>
            <p><strong>Status:</strong> ${orderData.status}</p>
            <p><strong>Order Time:</strong> ${new Date(orderData.createdAt).toLocaleString()}</p>
            <p><strong>Payment Method:</strong> ${orderData.paymentMethod}</p>
            ${orderData.customerPhone ? `<p><strong>Customer Phone:</strong> ${orderData.customerPhone}</p>` : ''}
            ${orderData.specialRequests ? `<p><strong>Special Requests:</strong> ${orderData.specialRequests}</p>` : ''}
            ${orderData.dietaryRequirements && orderData.dietaryRequirements.length > 0 ? 
              `<p><strong>Dietary Requirements:</strong> ${orderData.dietaryRequirements.join(', ')}</p>` : ''}
          </div>
          
          <div class="order-details">
            <h3>Order Items</h3>
            <table class="order-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${orderItems}
              </tbody>
            </table>
            
            <div class="total-section">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
              </div>
              ${orderData.tipAmount > 0 ? `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                  <span>Tip (${orderData.tipPercentage}%):</span>
                  <span>$${orderData.tipAmount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 2px solid #dee2e6; padding-top: 10px;">
                <span>Total:</span>
                <span>$${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/orders" class="action-button">
              View Order in Dashboard
            </a>
          </div>
          
          <p>Please prepare this order as soon as possible. The customer is waiting!</p>
        </div>
        
        <div class="footer">
          <p>This email was sent from ByteMe - Digital Dining Solutions</p>
          <p>© 2024 ByteMe. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'ByteMe <noreply@byteme.com>',
      to: vendorEmail,
      subject: `🚨 New Order Alert - Table ${orderData.tableNumber} - ByteMe`,
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('New order notification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending new order notification email:', error);
    throw error;
  }
};

//notify customer order ready
const sendOrderReadyEmail = async (customerEmail, customerName, orderData) => {
  try {
    const transporter = createTransporter();
    
    const orderItems = orderData.items.map(item => 
      `<tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`
    ).join('');
    
    const subtotal = orderData.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const total = subtotal + (orderData.tipAmount || 0);
    
    const emailContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Order is Ready - ByteMe</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 28px;
          font-weight: bold;
          color: #FE4B11;
          margin-bottom: 10px;
        }
        .tagline {
          color: #666;
          font-size: 14px;
        }
        .content {
          background: #f9f9f9;
          padding: 30px;
          border-radius: 10px;
          margin-bottom: 20px;
        }
        .order-details {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }
        .order-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .order-table th {
          background: #f8f9fa;
          padding: 12px;
          text-align: left;
          border-bottom: 2px solid #dee2e6;
          font-weight: bold;
        }
        .order-table td {
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        .total-section {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          margin-top: 20px;
        }
        .status-badge {
          display: inline-block;
          background: #007bff;
          color: white;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .footer {
          text-align: center;
          color: #666;
          font-size: 12px;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">ByteMe</div>
        <div class="tagline">Digital Dining Solutions</div>
      </div>

      <div class="content">
        <h2>Good news, ${customerName || 'Valued Customer'}! 🎉</h2>
        <p>Your order is now ready to be served!</p>
        <p>Please proceed to the counter or your table to collect it.</p>

        <div class="order-details">
          <h3>Order #${orderData._id.toString().slice(-8).toUpperCase()}</h3>
          <p><strong>Table:</strong> ${orderData.tableNumber}</p>
          <p><strong>Status:</strong> <span class="status-badge">READY</span></p>
          <p><strong>Order Time:</strong> ${new Date(orderData.createdAt).toLocaleString()}</p>
          <p><strong>Ready Time:</strong> ${new Date().toLocaleString()}</p>
          ${orderData.customerPhone ? `<p><strong>Phone:</strong> ${orderData.customerPhone}</p>` : ''}
          ${orderData.specialRequests ? `<p><strong>Special Requests:</strong> ${orderData.specialRequests}</p>` : ''}
          ${orderData.dietaryRequirements && orderData.dietaryRequirements.length > 0 ? 
            `<p><strong>Dietary Requirements:</strong> ${orderData.dietaryRequirements.join(', ')}</p>` : ''}
        </div>

        <div class="order-details">
          <h3>Order Items</h3>
          <table class="order-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${orderItems}
            </tbody>
          </table>

          <div class="total-section">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            ${orderData.tipAmount > 0 ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Tip (${orderData.tipPercentage}%):</span>
                <span>$${orderData.tipAmount.toFixed(2)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; border-top: 2px solid #dee2e6; padding-top: 10px;">
              <span>Total:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <p>We hope you enjoy your meal! 🍽️<br>
        Thank you for choosing ByteMe.</p>
      </div>

      <div class="footer">
        <p>This email was sent from ByteMe - Digital Dining Solutions</p>
        <p>© 2024 ByteMe. All rights reserved.</p>
      </div>
    </body>
    </html>

    `;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'ByteMe <noreply@byteme.com>',
      to: customerEmail,
      subject: `Order Confirmation #${orderData._id.toString().slice(-8).toUpperCase()} - ByteMe`,
      html: emailContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw error;
  }
};


module.exports = {
  sendPasswordResetEmail,
  sendVendorWelcomeEmail,
  sendCustomerWelcomeEmail,
  sendAdminWelcomeEmail,
  sendOrderConfirmationEmail,
  sendNewOrderNotificationEmail,
  sendOrderReadyEmail
};
