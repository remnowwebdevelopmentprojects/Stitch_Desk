# Read-Only Mode - Quick Reference

## What is Read-Only Mode?

When a subscription/trial expires, users get **30-day grace period** with:
- ✅ **VIEW** all data (customers, orders, invoices, etc.)
- ❌ **NO CREATE/EDIT/DELETE** operations
- 💰 Encourages renewal while preserving data access

After 30 days → Complete loss of access

---

## Backend - Quick Usage

### Apply to a ViewSet (Recommended)

```python
from subscriptions.permissions import ReadOnlyIfExpired

class CustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, ReadOnlyIfExpired]
    # ... rest of viewset
```

This automatically:
- Allows GET requests for expired users
- Blocks POST/PUT/PATCH/DELETE for expired users

### Manual Check in View

```python
if not request.user.subscription.has_write_access():
    return Response({
        'error': 'Subscription expired. Read-only access.',
        'is_read_only': True
    }, status=403)
```

---

## Frontend - Quick Usage

### 1. Import the Hook

```tsx
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess'
```

### 2. Use in Component

```tsx
const MyPage = () => {
  const { isReadOnly, hasWriteAccess, canCreate, canEdit } = useSubscriptionAccess()

  return (
    <div>
      <Button
        onClick={handleCreate}
        disabled={!canCreate}
      >
        Add New
      </Button>

      <Input
        value={data}
        readOnly={isReadOnly}
        disabled={!canEdit}
      />
    </div>
  )
}
```

### 3. Add Banner to Layout

```tsx
// In your main layout component
import { ReadOnlyBanner } from '@/components/ReadOnlyBanner'

export const Layout = ({ children }) => {
  return (
    <div>
      <Navbar />
      <div className="container">
        <ReadOnlyBanner />  {/* Add this */}
        {children}
      </div>
    </div>
  )
}
```

---

## Available Flags

```tsx
const {
  isReadOnly,      // true if in read-only mode
  hasWriteAccess,  // true if can create/edit/delete
  canCreate,       // same as hasWriteAccess
  canEdit,         // same as hasWriteAccess
  canDelete,       // same as hasWriteAccess
  isExpired,       // true if subscription expired
  isTrial,         // true if on trial
  daysRemaining,   // days until expiration
  subscription     // full subscription object
} = useSubscriptionAccess()
```

---

## Common Patterns

### Disable Button

```tsx
<Button
  onClick={handleSave}
  disabled={!hasWriteAccess}
>
  Save
</Button>
```

### Disable Form Input

```tsx
<Input
  name="name"
  value={name}
  readOnly={isReadOnly}
  disabled={!canEdit}
/>
```

### Conditional Rendering

```tsx
{hasWriteAccess && (
  <Button onClick={handleDelete}>
    Delete
  </Button>
)}
```

### Show Warning

```tsx
{isReadOnly && (
  <p className="text-destructive">
    Renew your subscription to edit this data
  </p>
)}
```

---

## Testing

### Set User to Read-Only Mode

```python
python manage.py shell
```

```python
from accounts.models import User
from django.utils import timezone
from datetime import timedelta

user = User.objects.get(email='test@example.com')
sub = user.subscription

# Expire trial 5 days ago (within 30-day grace period)
sub.status = 'trial'
sub.trial_end_date = timezone.now() - timedelta(days=5)
sub.save()

# Check status
print(f"Read access: {sub.has_read_access()}")   # True
print(f"Write access: {sub.has_write_access()}")  # False
print(f"Read-only: {sub.is_read_only()}")         # True
```

---

## Files Created

- ✅ `backend/subscriptions/permissions.py` - Permission classes
- ✅ `backend/subscriptions/models.py` - Access check methods
- ✅ `backend/subscriptions/serializers.py` - Added `is_read_only`, `has_write_access`
- ✅ `frontend/src/hooks/useSubscriptionAccess.ts` - React hook
- ✅ `frontend/src/components/ReadOnlyBanner.tsx` - Warning banner

---

## Next Steps

1. **Add ReadOnlyBanner to your main layout**
2. **Apply `ReadOnlyIfExpired` permission to all ViewSets**:
   - Customers
   - Orders
   - Invoices
   - Gallery
   - Inventory
   - Measurements
3. **Disable UI elements** using `useSubscriptionAccess` hook
4. **Test** with expired subscription

See [READ_ONLY_MODE_GUIDE.md](READ_ONLY_MODE_GUIDE.md) for detailed implementation guide.
