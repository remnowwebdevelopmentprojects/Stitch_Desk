import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle } from 'lucide-react'

export const HeroSection = () => {
  const navigate = useNavigate()

  const scrollToFeatures = () => {
    const element = document.querySelector('#features')
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="relative bg-gradient-to-br from-primary/5 via-white to-secondary/5 py-16 sm:py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Manage Your Boutique
              <span className="block text-primary mt-2">Effortlessly</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto lg:mx-0">
              Streamline customer management, measurements, orders, invoicing, and inventory
              - all in one beautiful platform designed for tailoring businesses.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" onClick={() => navigate('/signup')} className="text-base">
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={scrollToFeatures}>
                See Features
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 justify-center lg:justify-start text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span>Free forever plan</span>
              </div>
            </div>
          </div>

          {/* Right: Dashboard Preview */}
          <div className="hidden lg:block">
            <div className="rounded-xl shadow-2xl border border-border overflow-hidden bg-white">
              <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/60"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400/60"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
              </div>
              <div className="p-6 bg-gradient-to-br from-muted/30 to-white">
                {/* Placeholder dashboard mockup */}
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-border">
                      <div className="text-xs text-muted-foreground mb-1">Total Orders</div>
                      <div className="text-2xl font-bold text-foreground">247</div>
                    </div>
                    <div className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-border">
                      <div className="text-xs text-muted-foreground mb-1">Revenue</div>
                      <div className="text-2xl font-bold text-foreground">₹1.2L</div>
                    </div>
                    <div className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-border">
                      <div className="text-xs text-muted-foreground mb-1">Customers</div>
                      <div className="text-2xl font-bold text-foreground">89</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-border h-32 flex items-center justify-center">
                    <div className="text-muted-foreground text-sm">Dashboard Charts</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-border h-20"></div>
                    <div className="bg-white rounded-lg p-4 shadow-sm border border-border h-20"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
