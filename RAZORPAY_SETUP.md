# Razorpay Integration Setup Guide

## Overview
StitchDesk uses Razorpay for handling subscription payments. This guide will walk you through setting up Razorpay integration.

## 1. Create Razorpay Account

1. Go to [https://razorpay.com/](https://razorpay.com/)
2. Sign up for an account
3. Complete KYC verification (required for live mode)

## 2. Get API Keys

### Test Mode (for development):
1. Login to Razorpay Dashboard
2. Navigate to Settings → API Keys
3. Click "Generate Test Key"
4. Copy the **Key ID** and **Key Secret**

### Live Mode (for production):
1. Complete KYC verification
2. Navigate to Settings → API Keys
3. Click "Generate Live Key"
4. Copy the **Key ID** and **Key Secret**

## 3. Configure Environment Variables

Add the following to your `backend/.env` file:

```env
# Razorpay Configuration
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here  # Optional but recommended
```

## 4. Install Razorpay Package

The Razorpay Python SDK is already added to requirements.txt. Install it:

```bash
cd backend
source ../.venv/bin/activate
pip install razorpay==1.4.1
```

## 5. Setup Webhook (Optional but Recommended)

Webhooks allow Razorpay to notify your server about payment events.

1. In Razorpay Dashboard, go to Settings → Webhooks
2. Click "+ Add Webhook"
3. Enter your webhook URL: `https://yourdomain.com/api/subscriptions/webhook/`
   - For local testing with ngrok: `https://your-ngrok-url.ngrok.io/api/subscriptions/webhook/`
4. Select events to listen to:
   - `payment.captured`
   - `payment.failed`
5. Copy the **Webhook Secret** and add it to your `.env` file

## 6. Testing Locally with ngrok

For testing webhooks locally:

```bash
# Install ngrok
brew install ngrok  # macOS
# or download from https://ngrok.com/

# Start your Django server
python manage.py runserver

# In another terminal, start ngrok
ngrok http 8000

# Use the https URL provided by ngrok in Razorpay webhook settings
```

## 7. Payment Flow

### Frontend Integration

1. **Create Order**: Call `/api/subscriptions/subscribe/` with plan_id
   ```javascript
   const response = await axios.post('/api/subscriptions/subscribe/', {
     plan_id: selectedPlan.id
   }, {
     headers: { Authorization: `Token ${token}` }
   })

   const { order_id, amount, currency, key_id } = response.data
   ```

2. **Initialize Razorpay Checkout**:
   ```javascript
   const options = {
     key: key_id,
     amount: amount,
     currency: currency,
     order_id: order_id,
     name: 'StitchDesk',
     description: `${selectedPlan.name} Subscription`,
     handler: async function(response) {
       // Payment successful, verify on backend
       await axios.post('/api/subscriptions/verify-payment/', {
         razorpay_payment_id: response.razorpay_payment_id,
         razorpay_order_id: response.razorpay_order_id,
         razorpay_signature: response.razorpay_signature,
         plan_id: selectedPlan.id
       }, {
         headers: { Authorization: `Token ${token}` }
       })
     },
     prefill: {
       name: user.name,
       email: user.email
     },
     theme: {
       color: '#A77BB5'  // Your primary color
     }
   }

   const razorpay = new window.Razorpay(options)
   razorpay.open()
   ```

3. **Add Razorpay Script**: Include in your HTML
   ```html
   <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
   ```

## 8. Test Payment Credentials

For testing in test mode, use these test card details:

- **Card Number**: 4111 1111 1111 1111
- **CVV**: Any 3 digits
- **Expiry**: Any future date
- **Name**: Any name

## 9. API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/subscriptions/plans/` | GET | Get all active plans |
| `/api/subscriptions/my-subscription/` | GET | Get current user's subscription |
| `/api/subscriptions/subscribe/` | POST | Create payment order |
| `/api/subscriptions/verify-payment/` | POST | Verify and activate subscription |
| `/api/subscriptions/cancel/` | POST | Cancel subscription |
| `/api/subscriptions/webhook/` | POST | Razorpay webhook handler |

## 10. Security Considerations

1. **Never expose Key Secret**: Keep it in environment variables only
2. **Verify signatures**: Always verify payment signatures on backend
3. **Use HTTPS**: In production, always use HTTPS
4. **Webhook signatures**: Always verify webhook signatures
5. **Amount validation**: Verify the amount matches your plan price

## 11. Going Live Checklist

- [ ] Complete KYC verification on Razorpay
- [ ] Switch to Live API keys in production
- [ ] Update webhook URL to production domain
- [ ] Enable HTTPS on your domain
- [ ] Test payment flow with small amounts
- [ ] Setup proper error handling and logging
- [ ] Configure email notifications for failed payments
- [ ] Setup monitoring for webhook failures

## 12. Subscription Management

The system automatically:
- Creates a 14-day trial subscription on user registration
- Handles payment verification and subscription activation
- Calculates subscription end dates (30 days for monthly, 365 for yearly)
- Processes webhook events for payment status updates
- Allows super admin to assign custom plans

## 13. Common Issues

### Payment verification fails
- Check that RAZORPAY_KEY_SECRET is correctly set
- Verify the signature calculation matches Razorpay's format
- Ensure the order_id matches the one created

### Webhook not receiving events
- Verify webhook URL is accessible from internet
- Check Razorpay dashboard for webhook delivery status
- Ensure webhook secret is correctly configured
- Check server logs for errors

### Amount mismatch
- Razorpay expects amount in paise (multiply by 100)
- Verify plan price is correctly converted

## 14. Support

For issues with Razorpay integration:
- Razorpay Docs: https://razorpay.com/docs/
- Support: https://razorpay.com/support/
