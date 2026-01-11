import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Scissors, ArrowLeft, Search, Users, Ruler, ShoppingBag,
  FileText, Image, Package, Settings, CreditCard, Shield,
  ChevronDown, ChevronRight, Mail, MessageCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const categories = [
  {
    id: 'getting-started',
    icon: Scissors,
    title: 'Getting Started',
    description: 'Learn the basics of StitchDesk',
    articles: [
      { title: 'How to create your account', content: 'Visit our signup page and fill in your details. You can also sign up with Google for faster access.' },
      { title: 'Setting up your shop profile', content: 'Go to Settings > Business Settings to add your shop name, address, logo, and contact information.' },
      { title: 'Navigating the dashboard', content: 'The dashboard shows your key metrics including pending orders, today\'s deliveries, and recent activity.' },
      { title: 'Understanding the sidebar menu', content: 'Use the sidebar to navigate between Customers, Measurements, Orders, Invoices, Gallery, and Inventory.' },
    ]
  },
  {
    id: 'customers',
    icon: Users,
    title: 'Customer Management',
    description: 'Manage your customer database',
    articles: [
      { title: 'Adding a new customer', content: 'Click "Add Customer" on the Customers page. Enter the customer\'s name, phone, email, and address.' },
      { title: 'Searching for customers', content: 'Use the search bar to find customers by name, phone number, or email address.' },
      { title: 'Viewing customer history', content: 'Click on any customer to see their complete order history, measurements, and payment records.' },
      { title: 'Editing customer details', content: 'Click the edit icon next to a customer to update their information.' },
    ]
  },
  {
    id: 'measurements',
    icon: Ruler,
    title: 'Measurements',
    description: 'Track and manage measurements',
    articles: [
      { title: 'Recording measurements', content: 'Select a customer and add measurements for different garment types like shirts, pants, or blouses.' },
      { title: 'Measurement templates', content: 'Create templates for common garment types to speed up data entry.' },
      { title: 'Updating measurements', content: 'Measurements can be updated anytime. Previous versions are saved for reference.' },
      { title: 'Printing measurements', content: 'Click the print icon to generate a printable measurement card for any customer.' },
    ]
  },
  {
    id: 'orders',
    icon: ShoppingBag,
    title: 'Order Management',
    description: 'Create and track orders',
    articles: [
      { title: 'Creating a new order', content: 'Click "New Order" and select the customer. Add items, quantities, and delivery date.' },
      { title: 'Order statuses', content: 'Orders can be Pending, In Progress, Ready, Delivered, or Cancelled. Update status as work progresses.' },
      { title: 'Setting delivery dates', content: 'Choose a delivery date when creating an order. You\'ll see reminders for upcoming deliveries.' },
      { title: 'Adding order notes', content: 'Add special instructions or notes for each order that your team can reference.' },
    ]
  },
  {
    id: 'invoices',
    icon: FileText,
    title: 'Invoicing',
    description: 'Generate and manage invoices',
    articles: [
      { title: 'Creating an invoice', content: 'Select an order and click "Generate Invoice". The invoice is created with all order details.' },
      { title: 'Invoice templates', content: 'Choose between Standard, Compact, and Thermal templates based on your printing needs.' },
      { title: 'Recording payments', content: 'Mark partial or full payments on invoices. Track payment history for each customer.' },
      { title: 'Printing invoices', content: 'Click the print button to print or download invoices as PDF.' },
    ]
  },
  {
    id: 'gallery',
    icon: Image,
    title: 'Portfolio Gallery',
    description: 'Showcase your work',
    articles: [
      { title: 'Adding photos', content: 'Upload photos of your completed work to the gallery. Add categories and descriptions.' },
      { title: 'Public gallery link', content: 'Share your public gallery link with potential customers to showcase your work.' },
      { title: 'Managing categories', content: 'Organize photos by category like Bridal, Casual, Formal, or Traditional.' },
      { title: 'Gallery settings', content: 'Control what appears in your public gallery from the Gallery Settings.' },
    ]
  },
  {
    id: 'inventory',
    icon: Package,
    title: 'Inventory',
    description: 'Track materials and supplies',
    articles: [
      { title: 'Adding inventory items', content: 'Add fabrics, buttons, threads, and other materials to your inventory.' },
      { title: 'Stock alerts', content: 'Set minimum stock levels to receive alerts when items are running low.' },
      { title: 'Tracking usage', content: 'Log material usage against orders to track consumption.' },
      { title: 'Inventory reports', content: 'View reports on stock levels, usage patterns, and reorder needs.' },
    ]
  },
  {
    id: 'billing',
    icon: CreditCard,
    title: 'Billing & Subscription',
    description: 'Manage your subscription',
    articles: [
      { title: 'Subscription plans', content: 'Choose from Free, Professional, or Enterprise plans based on your needs.' },
      { title: 'Upgrading your plan', content: 'Go to Settings > Billing to upgrade to a higher plan anytime.' },
      { title: 'Payment methods', content: 'We accept all major credit cards, debit cards, UPI, and net banking via Razorpay.' },
      { title: 'Invoices and receipts', content: 'Download invoices for your subscription payments from the Billing section.' },
    ]
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Account & Security',
    description: 'Secure your account',
    articles: [
      { title: 'Changing your password', content: 'Go to Settings > Security to change your password. Use a strong, unique password.' },
      { title: 'Two-factor authentication', content: 'Enable 2FA for extra security. You\'ll receive an OTP via email when logging in.' },
      { title: 'Login with Google', content: 'Link your Google account for faster and more secure sign-in.' },
      { title: 'Account deletion', content: 'Contact support to request account deletion. All your data will be permanently removed.' },
    ]
  },
]

export const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null)

  const filteredCategories = categories.map(cat => ({
    ...cat,
    articles: cat.articles.filter(article =>
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => searchQuery === '' || cat.articles.length > 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">StitchDesk</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-white to-secondary/5 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Help Center</h1>
          <p className="text-muted-foreground mb-6">
            Find answers to common questions and learn how to get the most out of StitchDesk
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          {searchQuery && (
            <p className="text-sm text-muted-foreground mb-4">
              Showing results for "{searchQuery}"
            </p>
          )}

          <div className="space-y-4">
            {filteredCategories.map((category) => (
              <Card key={category.id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => setExpandedCategory(
                    expandedCategory === category.id ? null : category.id
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <category.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{category.title}</CardTitle>
                        <CardDescription>{category.description}</CardDescription>
                      </div>
                    </div>
                    {expandedCategory === category.id ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>

                {expandedCategory === category.id && (
                  <CardContent className="pt-0">
                    <div className="space-y-2 border-t pt-4">
                      {category.articles.map((article, idx) => (
                        <div key={idx} className="border rounded-lg">
                          <button
                            className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                            onClick={() => setExpandedArticle(
                              expandedArticle === `${category.id}-${idx}` ? null : `${category.id}-${idx}`
                            )}
                          >
                            <span className="font-medium text-foreground">{article.title}</span>
                            {expandedArticle === `${category.id}-${idx}` ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                          </button>
                          {expandedArticle === `${category.id}-${idx}` && (
                            <div className="px-3 pb-3 pt-0">
                              <p className="text-muted-foreground text-sm leading-relaxed">
                                {article.content}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
              <Button variant="link" onClick={() => setSearchQuery('')}>
                Clear search
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Contact Support */}
      <section className="py-12 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-xl font-bold text-foreground text-center mb-6">
            Still need help?
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <Mail className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Email Support</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Get help via email within 24 hours
                </p>
                <Button variant="outline" asChild>
                  <a href="mailto:support@stitchdesk.com">support@stitchdesk.com</a>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <MessageCircle className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">WhatsApp Support</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Chat with us on WhatsApp
                </p>
                <Button variant="outline" asChild>
                  <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer">
                    Start Chat
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} StitchDesk. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
