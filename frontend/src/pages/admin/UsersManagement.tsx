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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Edit, UserPlus } from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface Subscription {
  id: number
  user: number
  user_details: {
    id: number
    email: string
    name: string
  }
  plan: number | null
  plan_details: {
    id: number
    name: string
    plan_type: string
    price: string
  } | null
  status: 'trial' | 'active' | 'cancelled' | 'expired' | 'payment_failed'
  trial_end_date: string | null
  start_date: string | null
  end_date: string | null
  days_remaining: number
  is_active: boolean
}

interface Plan {
  id: number
  name: string
  plan_type: string
  billing_cycle: string
  price: string
}

const statusColors = {
  trial: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  cancelled: 'bg-orange-100 text-orange-800',
  expired: 'bg-red-100 text-red-800',
  payment_failed: 'bg-red-100 text-red-800',
}

export const UsersManagement = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [assignPlanData, setAssignPlanData] = useState({
    plan_id: '',
    start_date: '',
    end_date: '',
  })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createUserData, setCreateUserData] = useState({
    email: '',
    name: '',
    password: '',
    plan_id: 'none',
    end_date: '',
  })

  useEffect(() => {
    fetchSubscriptions()
    fetchPlans()
  }, [])

  const fetchSubscriptions = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/subscriptions/admin/subscriptions/`, {
        headers: { Authorization: `Token ${token}` },
      })
      setSubscriptions(response.data)
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/subscriptions/admin/plans/`, {
        headers: { Authorization: `Token ${token}` },
      })
      setPlans(response.data.filter((p: Plan) => p))
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    }
  }

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubscription) return

    try {
      const token = localStorage.getItem('token')
      await axios.post(
        `${API_BASE_URL}/subscriptions/admin/subscriptions/user/${selectedSubscription.user}/assign-plan/`,
        assignPlanData,
        {
          headers: { Authorization: `Token ${token}` },
        }
      )
      fetchSubscriptions()
      closeDialog()
    } catch (err) {
      console.error('Failed to assign plan:', err)
    }
  }

  const openAssignDialog = (subscription: Subscription) => {
    setSelectedSubscription(subscription)
    setAssignPlanData({
      plan_id: subscription.plan?.toString() || '',
      start_date: subscription.start_date
        ? new Date(subscription.start_date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      end_date: subscription.end_date
        ? new Date(subscription.end_date).toISOString().split('T')[0]
        : '',
    })
    setShowDialog(true)
  }

  const closeDialog = () => {
    setShowDialog(false)
    setSelectedSubscription(null)
    setAssignPlanData({
      plan_id: '',
      start_date: '',
      end_date: '',
    })
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('token')

      // Convert "none" to empty string for backend
      const dataToSend = {
        ...createUserData,
        plan_id: createUserData.plan_id === 'none' ? '' : createUserData.plan_id
      }

      await axios.post(
        `${API_BASE_URL}/subscriptions/admin/users/create/`,
        dataToSend,
        {
          headers: { Authorization: `Token ${token}` },
        }
      )
      alert('User created successfully!')
      fetchSubscriptions()
      closeCreateDialog()
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create user'
      alert(errorMessage)
      console.error('Failed to create user:', err)
    }
  }

  const openCreateDialog = () => {
    setShowCreateDialog(true)
  }

  const closeCreateDialog = () => {
    setShowCreateDialog(false)
    setCreateUserData({
      email: '',
      name: '',
      password: '',
      plan_id: 'none',
      end_date: '',
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Users & Subscriptions</h1>
          <p className="text-muted-foreground">Manage user subscriptions and assign custom plans</p>
        </div>
        <Button onClick={openCreateDialog}>
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{sub.user_details.name}</p>
                      <p className="text-sm text-muted-foreground">{sub.user_details.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {sub.plan_details ? (
                      <div>
                        <p className="font-medium">{sub.plan_details.name}</p>
                        <p className="text-sm text-muted-foreground">
                          ₹{parseFloat(sub.plan_details.price).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No plan</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[sub.status]}>{sub.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(sub.start_date || sub.trial_end_date)}</TableCell>
                  <TableCell>{formatDate(sub.end_date || sub.trial_end_date)}</TableCell>
                  <TableCell>
                    {sub.is_active ? (
                      <span className="text-green-600">{sub.days_remaining} days</span>
                    ) : (
                      <span className="text-red-600">Expired</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => openAssignDialog(sub)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Plan Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Plan to User</DialogTitle>
            <DialogDescription>
              {selectedSubscription &&
                `Assign a subscription plan to ${selectedSubscription.user_details.name}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAssignPlan} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="plan_id">Select Plan</Label>
              <Select
                value={assignPlanData.plan_id}
                onValueChange={(value) => setAssignPlanData({ ...assignPlanData, plan_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name} - ₹{parseFloat(plan.price).toLocaleString()} (
                      {plan.billing_cycle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={assignPlanData.start_date}
                onChange={(e) =>
                  setAssignPlanData({ ...assignPlanData, start_date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={assignPlanData.end_date}
                onChange={(e) =>
                  setAssignPlanData({ ...assignPlanData, end_date: e.target.value })
                }
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit">Assign Plan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new user account with optional subscription plan
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email*</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={createUserData.email}
                onChange={(e) =>
                  setCreateUserData({ ...createUserData, email: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name*</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={createUserData.name}
                onChange={(e) =>
                  setCreateUserData({ ...createUserData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password*</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={createUserData.password}
                onChange={(e) =>
                  setCreateUserData({ ...createUserData, password: e.target.value })
                }
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create_plan_id">Select Plan (Optional)</Label>
              <Select
                value={createUserData.plan_id}
                onValueChange={(value) =>
                  setCreateUserData({ ...createUserData, plan_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="No plan (Trial)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No plan (Trial)</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.name} - ₹{parseFloat(plan.price).toLocaleString()} (
                      {plan.billing_cycle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {createUserData.plan_id && createUserData.plan_id !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="create_end_date">Plan End Date (Optional)</Label>
                <Input
                  id="create_end_date"
                  type="date"
                  value={createUserData.end_date}
                  onChange={(e) =>
                    setCreateUserData({ ...createUserData, end_date: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Leave empty for no expiration
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog}>
                Cancel
              </Button>
              <Button type="submit">Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
