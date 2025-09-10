# Email Notifications Setup

This document explains how to set up email notifications for ByteMe order management.

## Features

- **Customer Order Confirmation**: Customers receive a thank you email with order details
- **Vendor Order Alerts**: Vendors get notified immediately when new orders are placed
- **Professional Templates**: HTML emails with ByteMe branding and order details
- **Error Handling**: Order creation continues even if emails fail

## Environment Variables

Add these to your `.env` file:

```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=ByteMe <noreply@byteme.com>
EMAIL_SERVICE=gmail

# Frontend URLs (for email links)
FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:3002
```

## Gmail Setup (Recommended for Development)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password as `EMAIL_PASSWORD`

## Production Email Services

For production, consider using:
- **SendGrid**: Professional email service
- **AWS SES**: Amazon's email service
- **Mailgun**: Developer-friendly email API
- **SMTP Server**: Your own email server

Update the `createTransporter()` function in `emailService.js` for production.

## Testing

Run the test script to verify email functionality:

```bash
node test-email-notifications.js
```

## Email Templates

### Customer Confirmation Email
- Order details and items
- Table number and status
- Special requests and dietary requirements
- Professional ByteMe branding

### Vendor Alert Email
- Prominent "NEW ORDER" alert
- Table number and order details
- Direct link to vendor dashboard
- Complete order breakdown

## Troubleshooting

### Common Issues

1. **"Invalid login" error**:
   - Use App Password instead of regular password
   - Enable 2FA on Gmail account

2. **"Connection timeout"**:
   - Check internet connection
   - Verify email service settings

3. **Emails not received**:
   - Check spam folder
   - Verify email addresses are correct
   - Check email service logs

### Debug Mode

Set `NODE_ENV=development` to see detailed email logs.

## Security Notes

- Never commit email credentials to version control
- Use environment variables for all sensitive data
- Consider using OAuth2 for production email services
- Implement rate limiting for email sending

## Customization

### Email Templates
Edit the HTML templates in `emailService.js`:
- `sendOrderConfirmationEmail()` - Customer email
- `sendNewOrderNotificationEmail()` - Vendor email

### Styling
All templates use inline CSS for maximum email client compatibility.

### Branding
Update colors, logos, and text to match your brand in the email templates.
