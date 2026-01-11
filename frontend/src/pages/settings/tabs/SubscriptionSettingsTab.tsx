import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Crown, Check, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface Plan {
  id: number
  name: string
  plan_type: string
  billing_cycle: string
  price: string
  max_customers: number | null
  max_orders_per_month: number | null
  max_gallery_images: number | null
  max_inventory_items: number | null
  max_staff_users: number | null
}

interface Subscription {
  id: number
  status: 'trial' | 'active' | 'cancelled' | 'expired' | 'payment_failed'
  trial_start_date: string | null
  trial_end_date: string | null
  start_date: string | null
  end_date: string | null
  days_remaining: number
  is_active: boolean
  plan_details: Plan | null
}

// Declare Razorpay on window
declare global {
  interface Window {
    Razorpay: any
  }
}

export const SubscriptionSettingsTab = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [selectedCycle, setSelectedCycle] = useState<'monthly' | 'yearly'>('monthly')

  useEffect(() => {
    fetchSubscription()
    fetchPlans()
    loadRazorpayScript()
  }, [])

  const loadRazorpayScript = () => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    document.body.appendChild(script)
  }

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/subscriptions/my-subscription/`, {
        headers: { Authorization: `Token ${token}` },
      })
      setSubscription(response.data)
    } catch (err) {
      console.error('Failed to fetch subscription:', err)
      alert('Error: Failed to load subscription details')
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/subscriptions/plans/`)
      setPlans(response.data)
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    }
  }

  const handleUpgrade = async (plan: Plan) => {
    setProcessingPayment(true)
    try {
      const token = localStorage.getItem('token')

      // Create Razorpay subscription
      const subscriptionResponse = await axios.post(
        `${API_BASE_URL}/subscriptions/subscribe/`,
        { plan_id: plan.id },
        { headers: { Authorization: `Token ${token}` } }
      )

      const { subscription_id, key_id } = subscriptionResponse.data
      const user = JSON.parse(localStorage.getItem('user') || '{}')

      // Initialize Razorpay for Subscriptions
      const options = {
        key: key_id,
        subscription_id: subscription_id,  // Use subscription_id instead of order_id
        name: 'StitchDesk',
        description: `${plan.name} - ${plan.billing_cycle} (Auto-renewal enabled)`,
        handler: async function (response: any) {
          try {
            // Verify subscription payment
            await axios.post(
              `${API_BASE_URL}/subscriptions/verify-payment/`,
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: plan.id,
              },
              { headers: { Authorization: `Token ${token}` } }
            )

            alert('Success! Your subscription has been activated with auto-renewal.')

            // Refresh subscription data
            fetchSubscription()
          } catch (err) {
            alert('Verification Failed: Payment verification failed. Please contact support.')
          } finally {
            setProcessingPayment(false)
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: '#A77BB5',
        },
        modal: {
          ondismiss: function () {
            setProcessingPayment(false)
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.open()
    } catch (err: any) {
      setProcessingPayment(false)
      alert(`Error: ${err.response?.data?.error || 'Failed to initiate payment'}`)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatLimit = (limit: number | null) => {
    return limit === null ? 'Unlimited' : limit.toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'trial':
        return 'bg-blue-100 text-blue-800'
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-orange-100 text-orange-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'payment_failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const monthlyPlans = plans.filter((p) => p.billing_cycle === 'monthly')
  const yearlyPlans = plans.filter((p) => p.billing_cycle === 'yearly')
  const displayPlans = selectedCycle === 'monthly' ? monthlyPlans : yearlyPlans

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>Your subscription status and plan details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {subscription?.plan_details?.name || 'Trial'}
                </h3>
                <Badge className={getStatusColor(subscription?.status || 'trial')}>
                  {subscription?.status?.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {subscription?.status === 'trial'
                  ? `Free trial - ${subscription.days_remaining} days remaining`
                  : subscription?.status === 'active'
                  ? `Active until ${formatDate(subscription.end_date)}`
                  : 'No active subscription'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {subscription?.plan_details ? `₹${parseFloat(subscription.plan_details.price).toLocaleString()}` : '₹0'}
              </p>
              <p className="text-sm text-muted-foreground">
                {subscription?.plan_details?.billing_cycle || 'Free trial'}
              </p>
            </div>
          </div>

          {/* Trial Warning */}
          {subscription?.status === 'trial' && subscription.days_remaining <= 7 && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  Trial ending soon
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-200">
                  Your trial expires in {subscription.days_remaining} days. Upgrade now to continue using StitchDesk.
                </p>
              </div>
            </div>
          )}

          {/* Subscription Details */}
          {subscription?.plan_details && (
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Customers</p>
                <p className="font-medium">{formatLimit(subscription.plan_details.max_customers)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Orders/month</p>
                <p className="font-medium">{formatLimit(subscription.plan_details.max_orders_per_month)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gallery Images</p>
                <p className="font-medium">{formatLimit(subscription.plan_details.max_gallery_images)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inventory Items</p>
                <p className="font-medium">{formatLimit(subscription.plan_details.max_inventory_items)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade/Change Plan */}
      {(subscription?.status === 'trial' || subscription?.status === 'expired') && (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
            <CardDescription>Choose a plan that fits your business needs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Billing Cycle Toggle */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-lg border p-1 bg-muted">
                <button
                  type="button"
                  onClick={() => setSelectedCycle('monthly')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    selectedCycle === 'monthly'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCycle('yearly')}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    selectedCycle === 'yearly'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Yearly <span className="text-green-600 ml-1">(Save 17%)</span>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {displayPlans.map((plan) => {
                const isCurrentPlan = subscription?.plan_details?.id === plan.id
                const isBasic = plan.plan_type === 'basic'

                return (
                  <div
                    key={plan.id}
                    className={cn(
                      'relative p-6 border rounded-lg',
                      !isBasic && 'border-primary ring-2 ring-primary',
                      isCurrentPlan && 'bg-green-50 dark:bg-green-950/20 border-green-500'
                    )}
                  >
                    {!isBasic && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full font-medium">
                        Most Popular
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <h3 className="text-xl font-semibold">{plan.name}</h3>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">
                          ₹{parseFloat(plan.price).toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          /{plan.billing_cycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-6">
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{formatLimit(plan.max_customers)} customers</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{formatLimit(plan.max_orders_per_month)} orders/month</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{formatLimit(plan.max_gallery_images)} gallery images</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{formatLimit(plan.max_inventory_items)} inventory items</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>
                          {plan.max_staff_users === null ? 'Unlimited' : plan.max_staff_users} staff users
                        </span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>Professional invoicing</span>
                      </li>
                      <li className="flex items-start gap-2 text-sm">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{isBasic ? 'Email' : 'Priority'} support</span>
                      </li>
                    </ul>

                    <Button
                      className="w-full"
                      variant={!isBasic ? 'default' : 'outline'}
                      disabled={processingPayment || isCurrentPlan}
                      onClick={() => handleUpgrade(plan)}
                    >
                      {processingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrentPlan ? (
                        'Current Plan'
                      ) : subscription?.status === 'trial' ? (
                        'Upgrade Now'
                      ) : (
                        'Renew'
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              All payments are processed securely through Razorpay
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
