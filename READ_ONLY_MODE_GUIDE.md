# Read-Only Mode Implementation Guide

## Overview

When a subscription or trial expires, users enter **Read-Only Mode** for 30 days:
- ✅ **Can VIEW** all their data (customers, orders, invoices, gallery, inventory)
- ❌ **Cannot CREATE/EDIT/DELETE** anything
- 💰 Encourages renewal while preserving data access

After 30-day grace period → Complete loss of access

---

## Backend Implementation

### 1. Access Level Methods (Already Added)

In `subscriptions/models.py`, the Subscription model now has:

```python
def has_access(self):
    """Full access (trial/subscription active)"""
    return self.is_trial_active() or self.is_subscription_active()

def has_write_access(self):
    """Can create/edit/delete - requires active subscription"""
    return self.has_access()

def has_read_access(self):
    """Can view data - includes 30-day grace period after expiration"""
    if self.has_access():
        return True

    # 30-day grace period for expired/cancelled users
    grace_period_days = 30

    if self.status == 'expired' and self.end_date:
        grace_end = self.end_date + timedelta(days=grace_period_days)
        return timezone.now() < grace_end

    # ... similar for trial, cancelled, payment_failed

def is_read_only(self):
    """Check if in read-only mode"""
    return self.has_read_access() and not self.has_write_access()
```

### 2. Permission Classes (Already Created)

Located in `subscriptions/permissions.py`:

#### Option A: `ReadOnlyIfExpired` (Recommended - All-in-One)

```python
from subscriptions.permissions import ReadOnlyIfExpired

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, ReadOnlyIfExpired])
def customer_list_create(request):
    # GET works for expired users (read-only)
    # POST blocked for expired users
    if request.method == 'GET':
        customers = Customer.objects.filter(shop=request.user.shop)
        # ... return customers

    elif request.method == 'POST':
        # This won't execute for expired users
        # ... create customer
```

#### Option B: Separate Checks (Fine-Grained Control)

```python
from subscriptions.permissions import HasReadAccess, HasWriteAccess

@api_view(['GET'])
@permission_classes([IsAuthenticated, HasReadAccess])
def customer_list(request):
    # Allows read even for expired users
    pass

@api_view(['POST'])
@permission_classes([IsAuthenticated, HasWriteAccess])
def customer_create(request):
    # Blocks expired users
    pass
```

### 3. Apply to ViewSets (DRF)

For Django REST Framework ViewSets:

```python
from rest_framework import viewsets
from subscriptions.permissions import ReadOnlyIfExpired

class CustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ReadOnlyIfExpired]
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer

    def get_queryset(self):
        return Customer.objects.filter(shop=self.request.user.shop)
```

This automatically:
- Allows `list()` and `retrieve()` for expired users
- Blocks `create()`, `update()`, `partial_update()`, `destroy()` for expired users

### 4. Manual Checks in Views

For custom logic:

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_invoice(request):
    subscription = request.user.subscription

    # Check write access
    if not subscription.has_write_access():
        return Response({
            'error': 'Your subscription has expired. Please renew to create invoices.',
            'is_read_only': True,
            'upgrade_url': '/settings/subscription'
        }, status=403)

    # Create invoice logic
    # ...
```

---

## Frontend Implementation

### 1. Check Read-Only Status

The subscription API now returns:

```json
{
  "id": 1,
  "status": "expired",
  "is_active": false,
  "is_read_only": true,
  "has_write_access": false,
  "days_remaining": 0,
  ...
}
```

### 2. Disable UI Elements

#### Option A: Using Subscription Context

Create a context provider:

```tsx
// src/contexts/SubscriptionContext.tsx
import { createContext, useContext } from 'react'
import { useCurrentUser } from '@/hooks/useAuth'

interface SubscriptionContextType {
  isReadOnly: boolean
  hasWriteAccess: boolean
  subscription: any
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null)

export const SubscriptionProvider = ({ children }) => {
  const { data: user } = useCurrentUser()
  const subscription = user?.subscription

  return (
    <SubscriptionContext.Provider value={{
      isReadOnly: subscription?.is_read_only || false,
      hasWriteAccess: subscription?.has_write_access || false,
      subscription
    }}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export const useSubscription = () => {
  const context = useContext(SubscriptionContext)
  if (!context) throw new Error('useSubscription must be used within SubscriptionProvider')
  return context
}
```

#### Option B: Direct Hook Usage

```tsx
// src/hooks/useSubscriptionAccess.ts
import { useCurrentUser } from './useAuth'

export const useSubscriptionAccess = () => {
  const { data: user } = useCurrentUser()
  const subscription = user?.subscription

  return {
    isReadOnly: subscription?.is_read_only || false,
    hasWriteAccess: subscription?.has_write_access || false,
    canCreate: subscription?.has_write_access || false,
    canEdit: subscription?.has_write_access || false,
    canDelete: subscription?.has_write_access || false,
    subscription
  }
}
```

### 3. Disable Buttons/Forms

```tsx
// Example: Customer Page
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

const CustomersPage = () => {
  const { isReadOnly, hasWriteAccess } = useSubscriptionAccess()

  return (
    <div>
      {isReadOnly && (
        <Alert variant="warning" className="mb-4">
          <AlertDescription>
            Your subscription has expired. You can view your data but cannot make changes.
            <a href="/settings/subscription" className="underline ml-2">
              Renew now to continue editing
            </a>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between mb-4">
        <h1>Customers</h1>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={!hasWriteAccess}
        >
          Add Customer
        </Button>
      </div>

      {/* Customer table - always visible */}
      <CustomerTable
        customers={customers}
        onEdit={(id) => !isReadOnly && handleEdit(id)}
        onDelete={(id) => !isReadOnly && handleDelete(id)}
        readOnly={isReadOnly}
      />
    </div>
  )
}
```

### 4. Disable Form Inputs

```tsx
// Example: Customer Form
const CustomerForm = ({ customer, onSave }) => {
  const { isReadOnly } = useSubscriptionAccess()

  return (
    <form onSubmit={onSave}>
      <Input
        name="name"
        value={customer.name}
        disabled={isReadOnly}
        readOnly={isReadOnly}
      />

      <Input
        name="email"
        value={customer.email}
        disabled={isReadOnly}
        readOnly={isReadOnly}
      />

      <Button
        type="submit"
        disabled={isReadOnly}
      >
        {isReadOnly ? 'View Only' : 'Save Changes'}
      </Button>

      {isReadOnly && (
        <p className="text-sm text-muted-foreground mt-2">
          Renew your subscription to edit this customer
        </p>
      )}
    </form>
  )
}
```

### 5. Show Read-Only Banner

```tsx
// src/components/ReadOnlyBanner.tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess'
import { Link } from 'react-router-dom'

export const ReadOnlyBanner = () => {
  const { isReadOnly, subscription } = useSubscriptionAccess()

  if (!isReadOnly) return null

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Read-Only Mode</AlertTitle>
      <AlertDescription>
        Your subscription has expired. You can view all your data but cannot create or edit anything.
        {' '}
        <Link to="/settings/subscription" className="underline font-medium">
          Renew now to restore full access
        </Link>
      </AlertDescription>
    </Alert>
  )
}
```

Add to Layout:

```tsx
// src/components/Layout.tsx
import { ReadOnlyBanner } from './ReadOnlyBanner'

export const Layout = ({ children }) => {
  return (
    <div>
      <Navbar />
      <div className="container mx-auto p-6">
        <ReadOnlyBanner />
        {children}
      </div>
    </div>
  )
}
```

---

## Implementation Checklist

### Backend

- [x] Add `has_read_access()`, `has_write_access()`, `is_read_only()` to Subscription model
- [x] Create permission classes in `subscriptions/permissions.py`
- [x] Update serializer to include `is_read_only` and `has_write_access`
- [ ] Apply `ReadOnlyIfExpired` permission to all ViewSets:
  - [ ] Customers ViewSet
  - [ ] Orders ViewSet
  - [ ] Invoices ViewSet
  - [ ] Gallery ViewSet
  - [ ] Inventory ViewSet
  - [ ] Measurements ViewSet

### Frontend

- [ ] Create `useSubscriptionAccess` hook
- [ ] Add ReadOnlyBanner component to main layout
- [ ] Disable "Create" buttons when `!hasWriteAccess`
- [ ] Disable form inputs when `isReadOnly`
- [ ] Show upgrade prompts on disabled actions
- [ ] Update each page:
  - [ ] Customers
  - [ ] Orders
  - [ ] Invoices
  - [ ] Gallery
  - [ ] Inventory
  - [ ] Measurements
  - [ ] Settings (except subscription settings)

---

## Example: Applying to Customers Module

### Backend

```python
# customers/views.py
from rest_framework import viewsets
from subscriptions.permissions import ReadOnlyIfExpired
from rest_framework.permissions import IsAuthenticated
from .models import Customer
from .serializers import CustomerSerializer

class CustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ReadOnlyIfExpired]
    serializer_class = CustomerSerializer

    def get_queryset(self):
        return Customer.objects.filter(shop=self.request.user.shop)

    def create(self, request, *args, **kwargs):
        # This automatically blocks if expired (ReadOnlyIfExpired handles it)
        return super().create(request, *args, **kwargs)
```

### Frontend

```tsx
// src/pages/customers/Customers.tsx
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess'
import { Button } from '@/components/ui/button'
import { PlusCircle } from 'lucide-react'

export const CustomersPage = () => {
  const { hasWriteAccess, isReadOnly } = useSubscriptionAccess()
  const [customers, setCustomers] = useState([])

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Customers</h1>
        <Button
          onClick={() => navigate('/customers/new')}
          disabled={!hasWriteAccess}
          title={isReadOnly ? 'Renew subscription to add customers' : ''}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Table always shows - viewing is allowed */}
      <CustomersTable
        customers={customers}
        readOnly={isReadOnly}
      />
    </div>
  )
}
```

---

## Testing

### Test Read-Only Mode

1. **Create expired subscription:**
```python
python manage.py shell
```

```python
from accounts.models import User
from django.utils import timezone
from datetime import timedelta

user = User.objects.get(email='test@example.com')
sub = user.subscription

# Set to expired 5 days ago
sub.status = 'trial'
sub.trial_end_date = timezone.now() - timedelta(days=5)
sub.save()

print(f"has_access: {sub.has_access()}")  # False
print(f"has_read_access: {sub.has_read_access()}")  # True (grace period)
print(f"has_write_access: {sub.has_write_access()}")  # False
print(f"is_read_only: {sub.is_read_only()}")  # True
```

2. **Test API:**
```bash
# Login and get token
TOKEN="your-token-here"

# GET request (should work)
curl -H "Authorization: Token $TOKEN" \
  http://localhost:8000/api/customers/

# POST request (should fail with 403)
curl -X POST \
  -H "Authorization: Token $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com"}' \
  http://localhost:8000/api/customers/
```

3. **Expected response:**
```json
{
  "detail": "Your subscription has expired. You can view your data but cannot make changes. Please renew to continue editing."
}
```

---

## Grace Period Timeline

```
Trial/Subscription Active
    ↓
[14/30/365 days of full access]
    ↓
Trial/Subscription Ends
    ↓
[30-day grace period - READ-ONLY]
    ├─ Can VIEW all data
    ├─ Cannot CREATE/EDIT/DELETE
    └─ Sees upgrade prompts
    ↓
After 30 days
    ↓
[Complete loss of access]
    └─ Must renew to access anything
```

---

## Summary

✅ **Implemented:**
- Backend access control methods
- Permission classes
- Serializer fields for frontend

🔨 **To Implement (Your Next Steps):**
1. Apply `ReadOnlyIfExpired` to all ViewSets
2. Create `useSubscriptionAccess` hook
3. Add ReadOnlyBanner component
4. Disable UI elements based on `hasWriteAccess`
5. Show upgrade prompts on disabled actions

This provides a much better UX than complete lockout!
