import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { apiClient } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Scissors, Check, ArrowLeft } from 'lucide-react'
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

export const Signup = () => {
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<'plan' | 'details'>('plan')
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  // Fetch plans on mount
  useEffect(() => {
    fetchPlans()
  }, [])

  // Check for redirect from Google login (no account found)
  useEffect(() => {
    const errorParam = searchParams.get('error')
    const emailParam = searchParams.get('email')

    if (errorParam === 'no_account') {
      setError('No account found with this Google account. Please sign up first.')
      if (emailParam) {
        setFormData(prev => ({ ...prev, email: emailParam }))
      }
    }
  }, [searchParams])

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/subscriptions/plans/`)
      setPlans(response.data)
    } catch (err) {
      console.error('Failed to fetch plans:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (!formData.agreedToTerms) {
      setError('Please agree to the Terms of Service')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const response = await apiClient.post('/auth/register/', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirm: formData.confirmPassword
      })

      // Store token and user data
      localStorage.setItem('token', response.data.token)
      localStorage.setItem('user', JSON.stringify(response.data.user))

      // Store selected plan for later payment flow
      if (selectedPlan) {
        localStorage.setItem('selectedPlanId', selectedPlan.id.toString())
      }

      navigate('/dashboard')
    } catch (err: any) {
      setError(
        err.response?.data?.email?.[0] ||
        err.response?.data?.error ||
        err.response?.data?.non_field_errors?.[0] ||
        'Registration failed. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignup = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google/login/?action=signup`
  }

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan)
    setStep('details')
  }

  const getFilteredPlans = (cycle: 'monthly' | 'yearly') => {
    return plans.filter(p => p.billing_cycle === cycle)
  }

  const formatLimit = (limit: number | null) => {
    return limit === null ? 'Unlimited' : limit.toLocaleString()
  }

  // Plan Selection Step
  if (step === 'plan') {
    const currentPlans = getFilteredPlans(billingCycle)
    const basicPlan = currentPlans.find(p => p.plan_type === 'basic')
    const proPlan = currentPlans.find(p => p.plan_type === 'pro')

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-secondary/5 p-4 py-12">
        <div className="w-full max-w-5xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Scissors className="h-10 w-10 text-primary" />
              <span className="text-3xl font-bold text-primary">StitchDesk</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
            <p className="text-muted-foreground">Start with a 14-day free trial. No credit card required.</p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex rounded-lg border p-1 bg-muted">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  billingCycle === 'monthly'
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-medium transition-colors',
                  billingCycle === 'yearly'
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Yearly <span className="text-green-600 ml-1">(Save 17%)</span>
              </button>
            </div>
          </div>

          {/* Plan Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Basic Plan */}
            {basicPlan && (
              <Card className="relative">
                <CardHeader>
                  <CardTitle>{basicPlan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">₹{parseFloat(basicPlan.price).toLocaleString()}</span>
                    <span className="text-muted-foreground ml-2">
                      /{basicPlan.billing_cycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  <CardDescription>Perfect for small boutiques</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Up to {formatLimit(basicPlan.max_customers)} customers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{formatLimit(basicPlan.max_orders_per_month)} orders/month</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{formatLimit(basicPlan.max_gallery_images)} gallery images</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{formatLimit(basicPlan.max_inventory_items)} inventory items</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Professional invoicing</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">14-day free trial</span>
                    </li>
                  </ul>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handlePlanSelect(basicPlan)}
                  >
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Pro Plan */}
            {proPlan && (
              <Card className="relative border-2 border-primary shadow-lg">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
                <CardHeader className="pt-8">
                  <CardTitle>{proPlan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">₹{parseFloat(proPlan.price).toLocaleString()}</span>
                    <span className="text-muted-foreground ml-2">
                      /{proPlan.billing_cycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  <CardDescription>For growing businesses</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm"><strong>Unlimited</strong> customers</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm"><strong>Unlimited</strong> orders</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm"><strong>Unlimited</strong> gallery images</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm"><strong>Unlimited</strong> inventory</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm"><strong>Unlimited</strong> staff users</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">Priority support</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">14-day free trial</span>
                    </li>
                  </ul>
                  <Button
                    className="w-full"
                    onClick={() => handlePlanSelect(proPlan)}
                  >
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    )
  }

  // Details Step
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-white to-secondary/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-4"
            onClick={() => setStep('plan')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Scissors className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">StitchDesk</span>
          </div>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            {selectedPlan && (
              <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {selectedPlan.name} - ₹{parseFloat(selectedPlan.price).toLocaleString()}/{selectedPlan.billing_cycle === 'monthly' ? 'mo' : 'yr'}
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Google Signup Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignup}
          >
            <img src="/google-icon.svg" alt="Google" className="h-5 w-5 mr-2" />
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="Minimum 6 characters"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                placeholder="Re-enter password"
              />
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="terms"
                checked={formData.agreedToTerms}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, agreedToTerms: e.target.checked })
                }
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight">
                I agree to the{' '}
                <a href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Start Free Trial'
              )}
            </Button>
          </form>

          {/* Login Link */}
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
