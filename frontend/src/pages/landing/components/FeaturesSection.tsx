import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Ruler, ShoppingBag, FileText, Image, Package } from 'lucide-react'

const features = [
  {
    id: 1,
    icon: Users,
    title: 'Customer Management',
    description: 'Track customer details, preferences, and order history in one place'
  },
  {
    id: 2,
    icon: Ruler,
    title: 'Measurements',
    description: 'Store and manage detailed body measurements with easy access'
  },
  {
    id: 3,
    icon: ShoppingBag,
    title: 'Order Tracking',
    description: 'Manage orders from creation to delivery with status updates'
  },
  {
    id: 4,
    icon: FileText,
    title: 'Professional Invoicing',
    description: 'Generate beautiful invoices and track payment status'
  },
  {
    id: 5,
    icon: Image,
    title: 'Portfolio Gallery',
    description: 'Showcase your work with a public gallery for customers'
  },
  {
    id: 6,
    icon: Package,
    title: 'Inventory Management',
    description: 'Track fabrics, materials, and supplies efficiently'
  }
]

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Everything You Need to Run Your Boutique
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features designed specifically for tailoring and boutique businesses
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <Card key={feature.id} className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
