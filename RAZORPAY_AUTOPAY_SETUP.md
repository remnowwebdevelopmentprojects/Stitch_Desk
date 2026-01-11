# Razorpay Autopay Subscription Setup Guide

## Overview
StitchDesk now uses **Razorpay Subscriptions** with autopay for recurring payments. Customers are automatically charged monthly or yearly without manual intervention.

---

## Part 1: Create Plans in Razorpay Dashboard

### Step 1: Login to Razorpay
1. Go to [https://dashboard.razorpay.com/](https://dashboard.razorpay.com/)
2. Login with your account
3. Switch to **Test Mode** for development (toggle in top-left corner)

### Step 2: Create Subscription Plans

1. Navigate to **Subscriptions → Plans** from the left sidebar
2. Click **+ Create New Plan**

#### Plan 1: Basic Monthly
```
Plan Name: StitchDesk Basic - Monthly
Billing Interval: Monthly
Billing Amount: ₹999
Billing Cycles: 12 (charges for 12 months)
Description: Basic plan with essential features
Setup Fee: 0
```
**Note the Plan ID** (format: `plan_xxxxxxxxxxxxx`) - you'll need this!

#### Plan 2: Basic Yearly
```
Plan Name: StitchDesk Basic - Yearly
Billing Interval: Yearly
Billing Amount: ₹9,990
Billing Cycles: 1 (charges for 1 year)
Description: Basic plan - annual billing
Setup Fee: 0
```
**Note the Plan ID**

#### Plan 3: Professional Monthly
```
Plan Name: StitchDesk Professional - Monthly
Billing Interval: Monthly
Billing Amount: ₹1,999
Billing Cycles: 12
Description: Professional plan with all features
Setup Fee: 0
```
**Note the Plan ID**

#### Plan 4: Professional Yearly
```
Plan Name: StitchDesk Professional - Yearly
Billing Interval: Yearly
Billing Amount: ₹19,990
Billing Cycles: 1
Description: Professional plan - annual billing
Setup Fee: 0
```
**Note the Plan ID**

---

## Part 2: Add Plan IDs to Database

### Option 1: Using Django Admin (Recommended)

1. Start your Django server:
```bash
cd backend
python manage.py runserver
```

2. Go to [http://localhost:8000/admin/](http://localhost:8000/admin/)
3. Login as superuser
4. Navigate to **Subscriptions → Subscription plans**
5. Edit each plan and add the corresponding **Razorpay Plan ID** from Step 2

### Option 2: Using Django Shell

```bash
cd backend
python manage.py shell
```

Then run:
```python
from subscriptions.models import SubscriptionPlan

# Update Basic Monthly
basic_monthly = SubscriptionPlan.objects.get(plan_type='basic', billing_cycle='monthly')
basic_monthly.razorpay_plan_id = 'plan_xxxxxxxxxxxxx'  # Replace with actual plan ID
basic_monthly.save()

# Update Basic Yearly
basic_yearly = SubscriptionPlan.objects.get(plan_type='basic', billing_cycle='yearly')
basic_yearly.razorpay_plan_id = 'plan_xxxxxxxxxxxxx'
basic_yearly.save()

# Update Pro Monthly
pro_monthly = SubscriptionPlan.objects.get(plan_type='pro', billing_cycle='monthly')
pro_monthly.razorpay_plan_id = 'plan_xxxxxxxxxxxxx'
pro_monthly.save()

# Update Pro Yearly
pro_yearly = SubscriptionPlan.objects.get(plan_type='pro', billing_cycle='yearly')
pro_yearly.razorpay_plan_id = 'plan_xxxxxxxxxxxxx'
pro_yearly.save()

print("All plans updated successfully!")
```

### Option 3: Direct SQL (If needed)

```sql
-- Connect to your database
psql -U postgres -d stitch_desk

-- Update plans with Razorpay Plan IDs
UPDATE subscriptions_subscriptionplan
SET razorpay_plan_id = 'plan_xxxxxxxxxxxxx'
WHERE plan_type = 'basic' AND billing_cycle = 'monthly';

UPDATE subscriptions_subscriptionplan
SET razorpay_plan_id = 'plan_xxxxxxxxxxxxx'
WHERE plan_type = 'basic' AND billing_cycle = 'yearly';

UPDATE subscriptions_subscriptionplan
SET razorpay_plan_id = 'plan_xxxxxxxxxxxxx'
WHERE plan_type = 'pro' AND billing_cycle = 'monthly';

UPDATE subscriptions_subscriptionplan
SET razorpay_plan_id = 'plan_xxxxxxxxxxxxx'
WHERE plan_type = 'pro' AND billing_cycle = 'yearly';
```

---

## Part 3: Configure Webhooks

### Step 1: Setup Webhook URL

1. In Razorpay Dashboard, go to **Settings → Webhooks**
2. Click **+ Add Webhook URL**
3. Enter webhook details:

**For Local Development (using ngrok):**
```
Webhook URL: https://your-ngrok-url.ngrok.io/api/subscriptions/webhook/
Active Events:
  ☑ subscription.charged
  ☑ subscription.cancelled
  ☑ subscription.completed
  ☑ subscription.authenticated
  ☑ subscription.payment_failed
Secret: (Generate and copy this)
```

**For Production:**
```
Webhook URL: https://yourdomain.com/api/subscriptions/webhook/
Active Events: (same as above)
Secret: (Generate and copy this)
```

### Step 2: Update Environment Variables

Add the webhook secret to `backend/.env`:
```env
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret_here
```

---

## Part 4: Testing with ngrok (Local Development)

### Install ngrok
```bash
# macOS
brew install ngrok

# Or download from https://ngrok.com/download
```

### Start ngrok
```bash
# Start Django server
cd backend
python manage.py runserver

# In another terminal, start ngrok
ngrok http 8000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`) and use it in the Razorpay webhook settings.

---

## Part 5: How Autopay Works

### Payment Flow

```
1. User clicks "Upgrade Now"
   ↓
2. Frontend calls /api/subscriptions/subscribe/ with plan_id
   ↓
3. Backend creates Razorpay Customer (if new)
   ↓
4. Backend creates Razorpay Subscription with plan_id
   ↓
5. Razorpay Checkout modal opens
   ↓
6. User enters payment details & authorizes
   ↓
7. First payment is charged immediately
   ↓
8. Subscription activated - auto-renewal enabled
   ↓
9. Razorpay automatically charges every billing cycle
   ↓
10. Webhook notifies backend about each payment
```

### Webhook Events

| Event | When it occurs | What happens |
|-------|---------------|--------------|
| `subscription.authenticated` | User completes first payment | Subscription activated |
| `subscription.charged` | Recurring payment successful | Payment recorded, subscription extended |
| `subscription.payment_failed` | Payment declined/failed | Retry attempts, notify user |
| `subscription.cancelled` | User or admin cancels | Subscription marked as cancelled |
| `subscription.completed` | All billing cycles done | Subscription marked as expired |

---

## Part 6: Testing the Integration

### Test with Razorpay Test Cards

**Successful Payment:**
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
Name: Any name
```

**Failed Payment (for testing failure scenarios):**
```
Card Number: 4111 1111 1111 1112
CVV: Any 3 digits
Expiry: Any future date
```

### Testing Steps

1. **Create Account**
   - Signup at `/signup`
   - User gets 14-day trial

2. **Upgrade to Paid Plan**
   - Go to Settings → Subscription
   - Select Basic or Pro plan
   - Click "Upgrade Now"
   - Complete payment with test card

3. **Verify Subscription**
   - Check subscription status changes to "Active"
   - Verify Razorpay Dashboard shows subscription
   - Check webhook was received

4. **Test Webhook Events**
   - Use Razorpay Dashboard to simulate events:
     - Go to Subscriptions → Click on subscription
     - Use "Test Webhook" to send test events

5. **Test Cancellation**
   - Click "Cancel Subscription"
   - Verify cancellation in Razorpay Dashboard
   - Check webhook received

---

## Part 7: Pricing Configuration

### Current Pricing Structure

**Basic Plan:**
- Monthly: ₹999/month
- Yearly: ₹9,990/year (17% savings)

**Professional Plan:**
- Monthly: ₹1,999/month
- Yearly: ₹19,990/year (17% savings)

### Modifying Prices

**In Razorpay Dashboard:**
1. Create new plan with new price
2. Update `razorpay_plan_id` in database

**In StitchDesk Database:**
1. Update the `price` field in `subscriptions_subscriptionplan` table
2. Existing subscriptions keep old price
3. New subscriptions use new price

---

## Part 8: Going Live Checklist

Before enabling live mode:

- [ ] Complete Razorpay KYC verification
- [ ] Create **Live** plans in Razorpay (repeat Part 1 in Live Mode)
- [ ] Update database with **Live** plan IDs
- [ ] Switch `.env` to use **Live** API keys:
  ```env
  RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
  RAZORPAY_KEY_SECRET=your_live_secret
  ```
- [ ] Update webhook URL to production domain
- [ ] Test with small real transactions first
- [ ] Setup monitoring for failed payments
- [ ] Configure email notifications for payment failures
- [ ] Test cancellation flow
- [ ] Verify webhook deliveries in Razorpay Dashboard

---

## Part 9: Admin Management

### View Subscriptions (Super Admin Panel)

1. Login as superuser
2. Go to `/admin/users`
3. View each user's subscription status
4. See payment history

### Manually Assign Custom Plans

Super admins can assign custom plans without payment:
1. Go to `/admin/users`
2. Find user
3. Click "Assign Custom Plan"
4. This bypasses Razorpay and directly updates the database

---

## Part 10: Customer Experience

### What Customers See

**Initial Subscription:**
```
1. Choose plan (Monthly/Yearly)
2. Click "Upgrade Now"
3. Razorpay modal opens
4. Enter card/UPI/netbanking details
5. Authorize subscription
6. ✓ Subscription activated!
7. Email confirmation sent
```

**Recurring Payments:**
```
- Razorpay automatically charges before expiry
- Customer receives email notification
- No action needed from customer
- Subscription extends automatically
```

**Cancellation:**
```
- Customer clicks "Cancel Subscription"
- Subscription stops immediately
- No further charges
- Access until current period ends
```

---

## Part 11: Troubleshooting

### Issue: Plan ID not found error
**Solution:** Ensure `razorpay_plan_id` is correctly set in database for that plan

### Issue: Webhook not receiving events
**Checklist:**
- Is webhook URL accessible from internet?
- Is ngrok running (for local dev)?
- Check Razorpay Dashboard → Webhooks → Deliveries for errors
- Verify webhook secret matches `.env`

### Issue: Payment verification failed
**Solution:**
- Check signature verification logic
- Ensure RAZORPAY_KEY_SECRET is correct
- Verify subscription_id matches

### Issue: Customer not created
**Solution:**
- Check email is valid
- Verify Razorpay customer creation in logs
- Ensure API keys are correct

---

## Part 12: API Endpoints Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/subscriptions/plans/` | GET | Public | List all active plans |
| `/api/subscriptions/my-subscription/` | GET | Required | Get current user's subscription |
| `/api/subscriptions/subscribe/` | POST | Required | Create Razorpay subscription |
| `/api/subscriptions/verify-payment/` | POST | Required | Verify and activate subscription |
| `/api/subscriptions/cancel/` | POST | Required | Cancel subscription |
| `/api/subscriptions/webhook/` | POST | Public | Razorpay webhook handler |

---

## Part 13: Database Schema Changes

The following fields are used for Razorpay Subscriptions:

**SubscriptionPlan Model:**
- `razorpay_plan_id` - Razorpay Plan ID (from dashboard)

**Subscription Model:**
- `razorpay_subscription_id` - Razorpay Subscription ID
- `razorpay_customer_id` - Razorpay Customer ID
- `status` - trial, active, cancelled, expired, payment_failed

**Payment Model:**
- `razorpay_payment_id` - Individual payment ID
- `razorpay_order_id` - Maps to subscription_id for recurring
- `razorpay_signature` - Payment signature

---

## Part 14: Security Best Practices

1. **Never expose Key Secret**
   - Keep in `.env` only
   - Never commit to git
   - Rotate keys if compromised

2. **Always verify signatures**
   - Backend verifies all payment signatures
   - Webhook signatures verified

3. **Use HTTPS in production**
   - Required for PCI compliance
   - Required for Razorpay webhooks

4. **Validate webhook source**
   - Signature verification prevents spoofing
   - Check IP whitelist if needed

---

## Need Help?

- **Razorpay Docs:** https://razorpay.com/docs/subscriptions/
- **Support:** https://razorpay.com/support/
- **StitchDesk Issues:** Contact your development team

---

**✅ Setup Complete!**

Your subscription system is now configured with autopay. Customers will be automatically charged every billing cycle without manual intervention.
