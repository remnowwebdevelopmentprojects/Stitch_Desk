# Handling Subscription Errors in Frontend

## Problem
When users try to create/edit data with an expired subscription, the backend returns a 403 error:
```json
{
  "detail": "Your subscription has expired. You can view your data but cannot make changes. Please renew to continue editing."
}
```

But the frontend doesn't show this error to the user - it just fails silently.

## Solution 1: Global Error Handler (Quickest Fix)

Use the `apiClient` with automatic error handling:

### Step 1: Import the apiClient

```tsx
// Before
import axios from 'axios'

// After
import apiClient from '@/lib/apiClient'
```

### Step 2: Replace axios calls

```tsx
// Before
const token = localStorage.getItem('token')
const response = await axios.post(`${API_BASE_URL}/customers/`, data, {
  headers: { Authorization: `Token ${token}` }
})

// After (token added automatically, errors handled automatically)
const response = await apiClient.post('/customers/', data)
```

**The apiClient will automatically:**
- ✅ Add auth token to requests
- ✅ Show alert when subscription errors occur
- ✅ Redirect to login on 401 errors

---

## Solution 2: Manual Error Handling

If you can't use the global handler, catch errors manually:

```tsx
import { customerService } from '@/services/customers'

const handleCreateCustomer = async (data) => {
  try {
    const customer = await customerService.create(data)
    // Success
    onSuccess(customer)
  } catch (error: any) {
    // Handle error
    if (error.response?.status === 403) {
      const message = error.response.data?.detail || 'Permission denied'
      alert(message)
    } else {
      alert('Failed to create customer. Please try again.')
    }
  }
}
```

---

## Solution 3: Disable Buttons (Best UX)

Instead of showing errors after clicking, **prevent clicks** by disabling buttons:

### Step 1: Import the hook

```tsx
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess'
```

### Step 2: Use in component

```tsx
export const CustomerForm = ({ onSuccess, customer, mode }) => {
  const { hasWriteAccess, isReadOnly } = useSubscriptionAccess()

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          disabled={!hasWriteAccess}
          title={isReadOnly ? 'Subscription expired - renew to add customers' : ''}
        >
          {mode === 'create' ? 'Add Customer' : 'Edit Customer'}
        </Button>
      </DialogTrigger>

      {/* Dialog content */}
    </Dialog>
  )
}
```

### Step 3: Disable form inputs

```tsx
<Input
  name="name"
  value={formData.name}
  onChange={handleChange}
  disabled={isReadOnly}  // Disable in read-only mode
  readOnly={isReadOnly}  // Also make read-only
/>
```

### Step 4: Disable submit button

```tsx
<Button
  type="submit"
  disabled={loading || !hasWriteAccess}
>
  {loading ? 'Saving...' : 'Save Customer'}
</Button>

{isReadOnly && (
  <p className="text-sm text-destructive mt-2">
    Your subscription has expired. Renew to edit customers.
  </p>
)}
```

---

## Example: Complete Customer Form with Read-Only Support

```tsx
import { useState } from 'react'
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess'
import { customerService } from '@/services/customers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'

export const CustomerForm = ({ onSuccess }) => {
  const { hasWriteAccess, isReadOnly } = useSubscriptionAccess()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Double-check write access
    if (!hasWriteAccess) {
      alert('Your subscription has expired. Please renew to add customers.')
      return
    }

    setLoading(true)
    try {
      const customer = await customerService.create(formData)
      onSuccess?.(customer)
      setOpen(false)
      // Reset form
      setFormData({ name: '', phone: '', email: '' })
    } catch (error: any) {
      if (error.response?.status === 403) {
        alert(error.response.data?.detail || 'Permission denied')
      } else {
        alert('Failed to create customer')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={!hasWriteAccess}
          title={isReadOnly ? 'Renew subscription to add customers' : 'Add new customer'}
        >
          Add Customer
        </Button>
      </DialogTrigger>

      <DialogContent>
        <form onSubmit={handleSubmit}>
          <Input
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            disabled={isReadOnly}
            required
          />

          <Input
            placeholder="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            disabled={isReadOnly}
            required
          />

          <Input
            placeholder="Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            disabled={isReadOnly}
          />

          <Button
            type="submit"
            disabled={loading || !hasWriteAccess}
          >
            {loading ? 'Creating...' : 'Create Customer'}
          </Button>

          {isReadOnly && (
            <p className="text-sm text-destructive mt-2">
              Your subscription has expired. Renew to add customers.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

---

## Which Solution To Use?

| Solution | Pros | Cons | When to Use |
|----------|------|------|-------------|
| **1. Global apiClient** | ✅ Quick fix<br>✅ Works everywhere<br>✅ No code changes needed | ⚠️ Still allows clicks | Immediate fix, minimal effort |
| **2. Manual error handling** | ✅ Fine-grained control | ❌ Repetitive code | Special cases only |
| **3. Disable buttons** | ✅ Best UX<br>✅ Prevents confusion<br>✅ No wasted API calls | ⚠️ Requires updating each form | Long-term, production-ready |

**Recommendation:** Start with Solution 1 (apiClient) for immediate fix, then gradually add Solution 3 (disable buttons) for better UX.

---

## Quick Start

1. **Immediate fix** - Use apiClient everywhere:
   ```tsx
   import apiClient from '@/lib/apiClient'
   const response = await apiClient.post('/customers/', data)
   ```

2. **Better UX** - Disable buttons:
   ```tsx
   const { hasWriteAccess } = useSubscriptionAccess()
   <Button disabled={!hasWriteAccess}>Add Customer</Button>
   ```

That's it! Errors will now be shown to users.
