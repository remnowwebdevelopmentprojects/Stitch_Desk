import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const pricingTiers = [
  {
    id: 'free',
    name: 'Free / Starter',
    price: '₹0',
    period: null,
    description: 'Perfect for getting started',
    features: [
      'Up to 50 customers',
      'Basic measurements',
      '10 orders per month',
      'Basic invoice templates',
      'Email support'
    ],
    cta: 'Start Free',
    featured: false
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '₹999',
    period: 'month',
    description: 'For growing boutiques',
    features: [
      'Unlimited customers',
      'Advanced measurements',
      'Unlimited orders',
      'All invoice templates',
      'Public gallery',
      'Inventory management',
      'Priority support',
      'Custom branding'
    ],
    cta: 'Start 14-day Trial',
    featured: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '₹2,499',
    period: 'month',
    description: 'For established businesses',
    features: [
      'Everything in Professional',
      'Multi-user access',
      'Advanced analytics',
      'API access',
      'Custom integrations',
      'Dedicated account manager',
      '24/7 phone support'
    ],
    cta: 'Contact Sales',
    featured: false
  }
]

export const PricingSection = () => {
  const navigate = useNavigate()

  return (
    <section id="pricing" className="py-20 bg-gradient-to-br from-secondary/5 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free, upgrade when you're ready
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-start">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.id}
              className={cn(
                'relative',
                tier.featured && 'border-2 border-primary shadow-lg md:scale-105'
              )}
            >
              {tier.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <CardHeader className={cn(tier.featured && 'pt-8')}>
                <CardTitle className="text-xl">{tier.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-foreground">{tier.price}</span>
                  {tier.period && (
                    <span className="text-muted-foreground ml-2">/{tier.period}</span>
                  )}
                </div>
                <CardDescription className="mt-2">{tier.description}</CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={tier.featured ? 'default' : 'outline'}
                  onClick={() => navigate('/signup')}
                >
                  {tier.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
