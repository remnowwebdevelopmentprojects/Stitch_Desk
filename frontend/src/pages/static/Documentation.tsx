import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Scissors, ArrowLeft, Book, Code, Rocket, Settings,
  Users, Ruler, ShoppingBag, FileText, Image, Package,
  ChevronRight, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const sections = [
  {
    id: 'quick-start',
    icon: Rocket,
    title: 'Quick Start Guide',
    description: 'Get up and running in minutes',
    content: `
## Welcome to StitchDesk

StitchDesk is a comprehensive boutique and tailoring shop management platform. This guide will help you get started quickly.

### Step 1: Create Your Account

1. Visit the [Signup page](/signup)
2. Enter your name, email, and create a password
3. Or click "Continue with Google" for faster signup
4. Verify your email if required

### Step 2: Set Up Your Shop

1. Go to **Settings** > **Business Settings**
2. Add your shop name and address
3. Upload your shop logo (recommended size: 200x200px)
4. Add your contact information

### Step 3: Add Your First Customer

1. Navigate to **Customers** in the sidebar
2. Click **Add Customer**
3. Fill in customer details (name, phone, email)
4. Save the customer

### Step 4: Record Measurements

1. Click on a customer to view their profile
2. Click **Add Measurements**
3. Select the garment type
4. Enter all relevant measurements
5. Save the measurements

### Step 5: Create an Order

1. Go to **Orders** > **New Order**
2. Select the customer
3. Add items with quantities and prices
4. Set the delivery date
5. Save and generate invoice if needed

You're all set! Continue exploring the platform to discover all features.
    `
  },
  {
    id: 'customers',
    icon: Users,
    title: 'Customer Management',
    description: 'Learn to manage your customer database',
    content: `
## Customer Management

The Customers module is the heart of StitchDesk. All orders, measurements, and invoices are linked to customers.

### Adding Customers

**Required Fields:**
- Name (first and last)
- Phone number (for contact)

**Optional Fields:**
- Email address
- Full address
- Notes

### Customer Profile

Each customer profile includes:
- **Overview**: Basic contact information
- **Measurements**: All recorded measurements by garment type
- **Orders**: Complete order history
- **Invoices**: Payment history and pending invoices

### Searching Customers

Use the search bar to find customers by:
- Name (partial matches work)
- Phone number
- Email address

### Bulk Import

Coming soon: Import customers from Excel/CSV files.
    `
  },
  {
    id: 'measurements',
    icon: Ruler,
    title: 'Measurements System',
    description: 'Track and manage customer measurements',
    content: `
## Measurements System

Accurate measurements are crucial for tailoring. StitchDesk helps you organize and track all customer measurements.

### Garment Types

Pre-configured measurement templates for:
- **Men's Shirt**: Chest, shoulders, sleeve length, collar, etc.
- **Men's Pants**: Waist, hip, inseam, outseam, thigh, etc.
- **Women's Blouse**: Bust, waist, hip, sleeve, length, etc.
- **Kurta**: Shoulder, chest, length, sleeve, etc.

### Recording Measurements

1. Navigate to customer profile
2. Click **Add Measurements**
3. Select garment type
4. Fill in all fields
5. Add any special notes
6. Save

### Measurement History

All measurement changes are tracked. You can:
- View previous measurements
- Compare changes over time
- Revert to older measurements if needed

### Printing Measurement Cards

Generate printable measurement cards for:
- Workshop reference
- Customer copies
- Tailor assignments
    `
  },
  {
    id: 'orders',
    icon: ShoppingBag,
    title: 'Order Management',
    description: 'Create and track orders efficiently',
    content: `
## Order Management

Track every order from creation to delivery with StitchDesk's order management system.

### Order Workflow

1. **Created**: Order is placed
2. **Pending**: Awaiting work to begin
3. **In Progress**: Currently being worked on
4. **Ready**: Completed, awaiting delivery/pickup
5. **Delivered**: Handed over to customer
6. **Cancelled**: Order was cancelled

### Creating Orders

When creating an order, specify:
- Customer (required)
- Items with descriptions
- Quantities and prices
- Delivery date
- Special instructions

### Order Items

Each order can have multiple items:
- Item description (e.g., "Silk Blouse")
- Quantity
- Unit price
- Total automatically calculated

### Delivery Management

- Set expected delivery dates
- View upcoming deliveries on dashboard
- Get reminders for due orders
- Mark orders as delivered

### Order Notes

Add internal notes for:
- Special instructions
- Fabric details
- Customer preferences
- Team communication
    `
  },
  {
    id: 'invoices',
    icon: FileText,
    title: 'Invoicing',
    description: 'Generate professional invoices',
    content: `
## Invoicing

Create professional invoices and track payments with ease.

### Invoice Templates

Choose from three templates:

1. **Standard**: Full-page invoice with all details
2. **Compact**: Condensed format for quick printing
3. **Thermal**: Optimized for thermal printers (80mm)

### Creating Invoices

Invoices can be created:
- From an existing order
- As a standalone invoice
- With or without linked measurements

### Invoice Contents

Each invoice includes:
- Unique invoice number
- Date and due date
- Customer details
- Itemized list with prices
- Tax calculations (if applicable)
- Total amount
- Payment status

### Payment Tracking

- Mark partial payments
- Track payment history
- Set payment due dates
- View outstanding balances

### Printing & Sharing

- Print directly from browser
- Download as PDF
- Share via WhatsApp (coming soon)
    `
  },
  {
    id: 'gallery',
    icon: Image,
    title: 'Portfolio Gallery',
    description: 'Showcase your work to potential customers',
    content: `
## Portfolio Gallery

Showcase your best work to attract new customers with a public gallery.

### Adding Photos

1. Go to **Gallery**
2. Click **Add Photo**
3. Upload image (max 5MB)
4. Add title and description
5. Select category
6. Choose if it should be public

### Categories

Organize photos by category:
- Bridal Wear
- Casual Wear
- Formal Wear
- Traditional
- Kids Wear
- Custom categories

### Public Gallery

Your public gallery:
- Accessible via unique link
- No login required to view
- Displays enabled photos only
- Shows your shop branding

### Gallery Settings

Control your gallery:
- Enable/disable public access
- Set gallery title
- Add gallery description
- Choose display order
    `
  },
  {
    id: 'inventory',
    icon: Package,
    title: 'Inventory Management',
    description: 'Track materials and supplies',
    content: `
## Inventory Management

Keep track of fabrics, materials, and supplies.

### Adding Items

Track inventory items:
- Item name
- Category (Fabric, Thread, Button, etc.)
- Quantity in stock
- Unit (meters, pieces, spools)
- Minimum stock level
- Purchase price
- Selling price (optional)

### Stock Alerts

Get notified when:
- Stock falls below minimum level
- Items are out of stock
- Reorder is needed

### Stock Adjustments

Record stock changes:
- Purchases (add stock)
- Usage (reduce stock)
- Adjustments (corrections)
- Returns

### Categories

Organize inventory by:
- Fabrics
- Threads
- Buttons & Closures
- Lining
- Accessories
- Tools
    `
  },
  {
    id: 'settings',
    icon: Settings,
    title: 'Settings & Configuration',
    description: 'Customize StitchDesk for your business',
    content: `
## Settings & Configuration

Customize StitchDesk to match your business needs.

### Business Settings

- Shop name and address
- Logo upload
- Contact information
- Business registration (GST, etc.)

### Invoice Settings

- Invoice number prefix
- Default payment terms
- Tax configuration
- Footer text

### Order Settings

- Order number prefix
- Default status workflow
- Delivery reminders

### Security Settings

- Change password
- Enable two-factor authentication
- Manage connected accounts (Google)

### Notification Settings

- Email notifications
- Delivery reminders
- Payment reminders
- Low stock alerts
    `
  },
]

export const Documentation = () => {
  const [activeSection, setActiveSection] = useState('quick-start')
  const currentSection = sections.find(s => s.id === activeSection)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">StitchDesk</span>
            <span className="text-muted-foreground ml-2">Documentation</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border min-h-[calc(100vh-65px)] p-4 hidden md:block sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <nav className="space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <section.icon className="h-4 w-4" />
                {section.title}
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-8 border-t">
            <p className="text-xs text-muted-foreground mb-3">Need more help?</p>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link to="/help">
                Visit Help Center
                <ExternalLink className="h-3 w-3 ml-2" />
              </Link>
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 md:p-8 max-w-4xl">
          {/* Mobile Section Selector */}
          <div className="md:hidden mb-6">
            <select
              value={activeSection}
              onChange={(e) => setActiveSection(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
            </select>
          </div>

          {currentSection && (
            <article>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <currentSection.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{currentSection.title}</h1>
                  <p className="text-muted-foreground">{currentSection.description}</p>
                </div>
              </div>

              <div className="prose prose-gray max-w-none">
                {currentSection.content.split('\n').map((line, idx) => {
                  if (line.startsWith('## ')) {
                    return <h2 key={idx} className="text-xl font-bold text-foreground mt-8 mb-4">{line.replace('## ', '')}</h2>
                  }
                  if (line.startsWith('### ')) {
                    return <h3 key={idx} className="text-lg font-semibold text-foreground mt-6 mb-3">{line.replace('### ', '')}</h3>
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={idx} className="font-semibold text-foreground mt-4">{line.replace(/\*\*/g, '')}</p>
                  }
                  if (line.startsWith('- ')) {
                    return <li key={idx} className="text-muted-foreground ml-4">{line.replace('- ', '')}</li>
                  }
                  if (line.match(/^\d+\. /)) {
                    return <li key={idx} className="text-muted-foreground ml-4 list-decimal">{line.replace(/^\d+\. /, '')}</li>
                  }
                  if (line.trim() === '') {
                    return <br key={idx} />
                  }
                  return <p key={idx} className="text-muted-foreground leading-relaxed">{line}</p>
                })}
              </div>

              {/* Next/Prev Navigation */}
              <div className="flex justify-between mt-12 pt-6 border-t">
                {sections.findIndex(s => s.id === activeSection) > 0 ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const idx = sections.findIndex(s => s.id === activeSection)
                      setActiveSection(sections[idx - 1].id)
                    }}
                  >
                    <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                    {sections[sections.findIndex(s => s.id === activeSection) - 1].title}
                  </Button>
                ) : <div />}

                {sections.findIndex(s => s.id === activeSection) < sections.length - 1 ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const idx = sections.findIndex(s => s.id === activeSection)
                      setActiveSection(sections[idx + 1].id)
                    }}
                  >
                    {sections[sections.findIndex(s => s.id === activeSection) + 1].title}
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : <div />}
              </div>
            </article>
          )}
        </main>
      </div>
    </div>
  )
}
