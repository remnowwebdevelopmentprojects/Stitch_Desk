# StitchDesk - Feature List & Subscription System

## IMPORTANT: Both Plans Get ALL Features!
**The only difference is usage limits:**
- Basic Plan: Limited usage
- Pro Plan: Unlimited/Higher limits

---

## Complete Feature List (ALL Plans)

### 1. Customer Management
- Add, edit, delete customers
- Store contact details
- Track customer history
- **Basic**: Up to 100 customers
- **Pro**: Unlimited customers

### 2. Measurements
- Record measurements by garment type
- Measurement history tracking
- Print measurement cards
- **Basic**: Unlimited
- **Pro**: Unlimited

### 3. Order Management
- Create and track orders
- Order status workflow
- Delivery date tracking
- Special instructions
- **Basic**: Up to 50 orders per month
- **Pro**: Unlimited orders

### 4. Invoicing
- Generate professional invoices
- Multiple templates (Standard, Compact, Thermal)
- Payment tracking
- Outstanding balances
- **Basic**: Unlimited invoices
- **Pro**: Unlimited invoices

### 5. Portfolio Gallery
- Upload work photos
- Categorize images
- Public gallery link
- Share with customers
- **Basic**: Up to 50 images
- **Pro**: Unlimited images

### 6. Inventory Management
- Track fabrics and materials
- Stock alerts
- Usage tracking
- Categories
- **Basic**: Up to 100 items
- **Pro**: Unlimited items

### 7. Multi-User Access
- Add staff members
- Role-based permissions
- Team collaboration
- **Basic**: 1 user (owner only)
- **Pro**: Unlimited users

### 8. Business Settings
- Shop name, logo, address
- Custom prefixes
- Invoice templates
- Branding
- **Basic**: ✓ Available
- **Pro**: ✓ Available

### 9. Payment Tracking
- Record payments
- Payment history
- Payment methods
- Due dates
- **Basic**: ✓ Available
- **Pro**: ✓ Available

### 10. Dashboard Analytics
- Key metrics
- Pending orders
- Revenue tracking
- Customer insights
- **Basic**: ✓ Basic analytics
- **Pro**: ✓ Advanced analytics

### 11. Security Features
- Password management
- Two-factor authentication (2FA)
- Forgot password
- Google Sign-In
- **Basic**: ✓ Available
- **Pro**: ✓ Available

### 12. Email Support
- Responsive support team
- Email tickets
- **Basic**: ✓ Available
- **Pro**: ✓ Priority support

---

## Subscription Plans

### Free Trial
- **Duration**: 14 days
- **Access**: Full Pro plan features
- **No credit card required**
- **After trial**: Must choose a paid plan

### Plan 1: Basic

**Monthly**: ₹599/month
**Yearly**: ₹5,990/year **(Save ₹1,098 - 2 months free!)**

**Usage Limits:**
- ✓ Up to 100 customers
- ✓ Up to 50 orders per month
- ✓ Up to 50 gallery images
- ✓ Up to 100 inventory items
- ✓ 1 user (owner only)

**All Features Included:**
- ✓ Customer Management
- ✓ Measurements
- ✓ Order Management
- ✓ Invoicing (all templates)
- ✓ Portfolio Gallery
- ✓ Inventory
- ✓ Dashboard
- ✓ Payment Tracking
- ✓ Business Settings
- ✓ Security (2FA)
- ✓ Email Support

### Plan 2: Pro

**Monthly**: ₹1,099/month
**Yearly**: ₹10,990/year **(Save ₹2,198 - 2 months free!)**

**Usage Limits:**
- ✓ **Unlimited** customers
- ✓ **Unlimited** orders
- ✓ **Unlimited** gallery images
- ✓ **Unlimited** inventory items
- ✓ **Unlimited** staff users

**All Features Included:**
- ✓ Everything in Basic
- ✓ No usage limits
- ✓ Multi-user access
- ✓ Advanced analytics
- ✓ Priority support
- ✓ Custom branding
- ✓ Data export

---

## Plan Comparison

| Feature | Basic | Pro |
|---------|-------|-----|
| **Customer Management** | Up to 100 | Unlimited |
| **Orders per Month** | Up to 50 | Unlimited |
| **Gallery Images** | Up to 50 | Unlimited |
| **Inventory Items** | Up to 100 | Unlimited |
| **Staff Users** | 1 (owner) | Unlimited |
| **Measurements** | ✓ Unlimited | ✓ Unlimited |
| **Invoicing** | ✓ All templates | ✓ All templates |
| **Payment Tracking** | ✓ | ✓ |
| **Dashboard** | ✓ Basic | ✓ Advanced |
| **2FA Security** | ✓ | ✓ |
| **Email Support** | ✓ | ✓ Priority |
| **Data Export** | ✗ | ✓ |

---

## Database Schema

### SubscriptionPlan Model
```python
- id
- name (e.g., "Basic - Monthly")
- plan_type ('basic', 'pro', 'custom')
- billing_cycle ('monthly', 'yearly')
- price (Decimal)

# Usage Limits (null = unlimited)
- max_customers (Int)
- max_orders_per_month (Int)
- max_gallery_images (Int)
- max_inventory_items (Int)
- max_staff_users (Int)

# Razorpay
- razorpay_plan_id (String)
- is_active (Boolean)
- created_at, updated_at
```

### Subscription Model
```python
- user (OneToOne → User)
- plan (ForeignKey → SubscriptionPlan)
- status ('trial', 'active', 'cancelled', 'expired', 'payment_failed')
- trial_start_date, trial_end_date
- start_date, end_date
- razorpay_subscription_id
- razorpay_customer_id
- cancelled_at
- cancel_at_period_end
```

### Payment Model
```python
- subscription (ForeignKey)
- amount, currency
- status ('pending', 'completed', 'failed', 'refunded')
- razorpay_payment_id, razorpay_order_id, razorpay_signature
- payment_method
```

---

## Access Control Logic

### Limit Checking
```python
def can_add_customer(user):
    plan = user.subscription.plan
    if plan.max_customers is None:
        return True  # Unlimited
    current_count = user.shop.customers.count()
    return current_count < plan.max_customers

def can_add_order(user):
    plan = user.subscription.plan
    if plan.max_orders_per_month is None:
        return True  # Unlimited
    # Count orders this month
    current_month_orders = user.shop.orders.filter(
        created_at__month=now().month
    ).count()
    return current_month_orders < plan.max_orders_per_month
```

---

## Implementation To-Do

- [ ] Add `subscriptions` to INSTALLED_APPS in settings.py
- [ ] Run `python manage.py makemigrations`
- [ ] Run `python manage.py migrate`
- [ ] Run init script: `python manage.py shell < subscriptions/init_plans.py`
- [ ] Create super admin panel (frontend + backend)
- [ ] Update signup page with plan selection
- [ ] Add Razorpay integration
- [ ] Create subscription middleware
- [ ] Add usage limit checks to views
- [ ] Create user subscription management page

---

## Razorpay Setup

1. Create account at razorpay.com
2. Get API keys from Dashboard
3. Add to `.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   ```
4. Create subscription plans in Razorpay
5. Copy plan IDs to database

---

## Next Steps

Ready to implement:
1. Super admin panel for plan management
2. Updated signup page with plan selection
3. Razorpay payment integration
4. Subscription middleware for access control
5. User subscription management UI

Which should I start with?
