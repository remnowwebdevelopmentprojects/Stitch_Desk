import { Layout } from '@/components/layout/Layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, ShoppingCart, FileText, CreditCard, Shield, CreditCardIcon, Image } from 'lucide-react'
import { BusinessSettingsTab } from './tabs/BusinessSettingsTab'
import { OrderSettingsTab } from './tabs/OrderSettingsTab'
import { InvoiceSettingsTab } from './tabs/InvoiceSettingsTab'
import { PaymentSettingsTab } from './tabs/PaymentSettingsTab'
import { SecuritySettingsTab } from './tabs/SecuritySettingsTab'
import { SubscriptionSettingsTab } from './tabs/SubscriptionSettingsTab'
import { GallerySettings } from '@/components/gallery/GallerySettings'

export const Settings = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your shop settings, preferences, and security options.
          </p>
        </div>

        <Tabs defaultValue="business" className="w-full">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto lg:inline-grid">
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Business</span>
            </TabsTrigger>
            <TabsTrigger value="order" className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Order</span>
            </TabsTrigger>
            <TabsTrigger value="invoice" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Invoice</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payment</span>
            </TabsTrigger>
            <TabsTrigger value="gallery" className="flex items-center gap-2">
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Gallery</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center gap-2">
              <CreditCardIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Subscription</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="business">
              <BusinessSettingsTab />
            </TabsContent>
            <TabsContent value="order">
              <OrderSettingsTab />
            </TabsContent>
            <TabsContent value="invoice">
              <InvoiceSettingsTab />
            </TabsContent>
            <TabsContent value="payment">
              <PaymentSettingsTab />
            </TabsContent>
            <TabsContent value="gallery">
              <GallerySettings />
            </TabsContent>
            <TabsContent value="security">
              <SecuritySettingsTab />
            </TabsContent>
            <TabsContent value="subscription">
              <SubscriptionSettingsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  )
}
