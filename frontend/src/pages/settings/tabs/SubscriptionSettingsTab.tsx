import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Crown, Check } from 'lucide-react'

export const SubscriptionSettingsTab = () => {
  // Placeholder subscription data
  const currentPlan = {
    name: 'Free',
    price: '₹0',
    features: [
      'Up to 50 customers',
      'Up to 100 orders per month',
      'Basic invoice templates',
      'Email support',
    ],
  }

  const plans = [
    {
      name: 'Free',
      price: '₹0',
      period: '/month',
      features: [
        'Up to 50 customers',
        'Up to 100 orders per month',
        'Basic invoice templates',
        'Email support',
      ],
      current: true,
    },
    {
      name: 'Pro',
      price: '₹499',
      period: '/month',
      features: [
        'Unlimited customers',
        'Unlimited orders',
        'Premium invoice templates',
        'Priority support',
        'Advanced analytics',
        'Multiple staff accounts',
      ],
      current: false,
      recommended: true,
    },
    {
      name: 'Enterprise',
      price: '₹1499',
      period: '/month',
      features: [
        'Everything in Pro',
        'Custom branding',
        'API access',
        'Dedicated support',
        'Custom integrations',
        'SLA guarantee',
      ],
      current: false,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>
            Your current subscription plan and billing details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div>
              <h3 className="text-lg font-semibold">{currentPlan.name} Plan</h3>
              <p className="text-sm text-muted-foreground">
                You are currently on the free plan.
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{currentPlan.price}</p>
              <p className="text-sm text-muted-foreground">per month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>
            Upgrade your plan to unlock more features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div 
                key={plan.name}
                className={`relative p-4 border rounded-lg ${
                  plan.recommended 
                    ? 'border-primary ring-2 ring-primary' 
                    : plan.current 
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                      : ''
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
                    Recommended
                  </div>
                )}
                {plan.current && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                    Current Plan
                  </div>
                )}
                <div className="text-center mb-4 pt-2">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  className="w-full" 
                  variant={plan.current ? 'outline' : plan.recommended ? 'default' : 'secondary'}
                  disabled={plan.current}
                >
                  {plan.current ? 'Current Plan' : 'Upgrade'}
                </Button>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center mt-6">
            Subscription management coming soon. Contact support for enterprise plans.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
