import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2 } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface Plan {
  id: number
  name: string
  plan_type: 'basic' | 'pro' | 'custom'
  billing_cycle: 'monthly' | 'yearly'
  price: string
  max_customers: number | null
  max_orders_per_month: number | null
  max_gallery_images: number | null
  max_inventory_items: number | null
  max_staff_users: number | null
  is_active: boolean
  razorpay_plan_id: string | null
}

interface PlanFormData {
  name: string
  plan_type: string
  billing_cycle: string
  price: string
  max_customers: string
  max_orders_per_month: string
  max_gallery_images: string
  max_inventory_items: string
  max_staff_users: string
  is_active: boolean
}

export const PlansManagement = () => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [formData, setFormData] = useState<PlanFormData>({
    name: '',
    plan_type: 'custom',
    billing_cycle: 'monthly',
    price: '',
    max_customers: '',
    max_orders_per_month: '',
    max_gallery_images: '',
    max_inventory_items: '',
    max_staff_users: '',
    is_active: true,
  })

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/subscriptions/admin/plans/`, {
        headers: { Authorization: `Token ${token}` },
      })
      setPlans(response.data)
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('token')

    // Convert empty strings to null for unlimited
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      max_customers: formData.max_customers ? parseInt(formData.max_customers) : null,
      max_orders_per_month: formData.max_orders_per_month
        ? parseInt(formData.max_orders_per_month)
        : null,
      max_gallery_images: formData.max_gallery_images
        ? parseInt(formData.max_gallery_images)
        : null,
      max_inventory_items: formData.max_inventory_items
        ? parseInt(formData.max_inventory_items)
        : null,
      max_staff_users: formData.max_staff_users ? parseInt(formData.max_staff_users) : null,
    }

    try {
      if (editingPlan) {
        await axios.patch(`${API_BASE_URL}/subscriptions/admin/plans/${editingPlan.id}/`, payload, {
          headers: { Authorization: `Token ${token}` },
        })
      } else {
        await axios.post(`${API_BASE_URL}/subscriptions/admin/plans/`, payload, {
          headers: { Authorization: `Token ${token}` },
        })
      }
      fetchPlans()
      closeDialog()
    } catch (err) {
      console.error('Failed to save plan:', err)
    }
  }

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      plan_type: plan.plan_type,
      billing_cycle: plan.billing_cycle,
      price: plan.price,
      max_customers: plan.max_customers?.toString() || '',
      max_orders_per_month: plan.max_orders_per_month?.toString() || '',
      max_gallery_images: plan.max_gallery_images?.toString() || '',
      max_inventory_items: plan.max_inventory_items?.toString() || '',
      max_staff_users: plan.max_staff_users?.toString() || '',
      is_active: plan.is_active,
    })
    setShowDialog(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this plan?')) return

    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_BASE_URL}/subscriptions/admin/plans/${id}/`, {
        headers: { Authorization: `Token ${token}` },
      })
      fetchPlans()
    } catch (err) {
      console.error('Failed to delete plan:', err)
    }
  }

  const closeDialog = () => {
    setShowDialog(false)
    setEditingPlan(null)
    setFormData({
      name: '',
      plan_type: 'custom',
      billing_cycle: 'monthly',
      price: '',
      max_customers: '',
      max_orders_per_month: '',
      max_gallery_images: '',
      max_inventory_items: '',
      max_staff_users: '',
      is_active: true,
    })
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Subscription Plans</h1>
          <p className="text-muted-foreground">Manage subscription plans and pricing</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.is_active ? 'opacity-50' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground capitalize">
                    {plan.plan_type} - {plan.billing_cycle}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(plan.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold mb-4">₹{parseFloat(plan.price).toLocaleString()}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Customers:</span>
                  <span>{plan.max_customers || 'Unlimited'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Orders/month:</span>
                  <span>{plan.max_orders_per_month || 'Unlimited'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gallery:</span>
                  <span>{plan.max_gallery_images || 'Unlimited'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Inventory:</span>
                  <span>{plan.max_inventory_items || 'Unlimited'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff:</span>
                  <span>{plan.max_staff_users || 'Unlimited'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
            <DialogDescription>
              Configure subscription plan details. Leave limits empty for unlimited.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan_type">Plan Type</Label>
                <Select
                  value={formData.plan_type}
                  onValueChange={(value) => setFormData({ ...formData, plan_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billing_cycle">Billing Cycle</Label>
                <Select
                  value={formData.billing_cycle}
                  onValueChange={(value) => setFormData({ ...formData, billing_cycle: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Usage Limits (leave empty for unlimited)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_customers">Max Customers</Label>
                  <Input
                    id="max_customers"
                    type="number"
                    placeholder="Unlimited"
                    value={formData.max_customers}
                    onChange={(e) =>
                      setFormData({ ...formData, max_customers: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_orders_per_month">Max Orders/Month</Label>
                  <Input
                    id="max_orders_per_month"
                    type="number"
                    placeholder="Unlimited"
                    value={formData.max_orders_per_month}
                    onChange={(e) =>
                      setFormData({ ...formData, max_orders_per_month: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_gallery_images">Max Gallery Images</Label>
                  <Input
                    id="max_gallery_images"
                    type="number"
                    placeholder="Unlimited"
                    value={formData.max_gallery_images}
                    onChange={(e) =>
                      setFormData({ ...formData, max_gallery_images: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_inventory_items">Max Inventory Items</Label>
                  <Input
                    id="max_inventory_items"
                    type="number"
                    placeholder="Unlimited"
                    value={formData.max_inventory_items}
                    onChange={(e) =>
                      setFormData({ ...formData, max_inventory_items: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_staff_users">Max Staff Users</Label>
                  <Input
                    id="max_staff_users"
                    type="number"
                    placeholder="Unlimited"
                    value={formData.max_staff_users}
                    onChange={(e) =>
                      setFormData({ ...formData, max_staff_users: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit">{editingPlan ? 'Update Plan' : 'Create Plan'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
